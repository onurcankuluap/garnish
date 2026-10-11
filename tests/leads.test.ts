import { describe, expect, it } from "vitest";
import { RedisLeadStore, type RedisLike } from "@/lib/leads/redisStore";
import { MemoryLeadStore } from "@/lib/leads/memoryStore";
import { needsRecovery, recoverLeads } from "@/lib/leads/recovery";
import { handleRecover } from "@/lib/leads/recoverHandler";
import { MockNotifier } from "@/lib/contact/notifier";
import type { LeadRecord } from "@/lib/leads/types";

const NOW = new Date("2026-10-10T19:00:00Z");

function lead(id: string, overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    v: 1,
    id,
    idempotencyKey: `key-${id}`,
    createdAt: NOW.toISOString(),
    data: {
      name: "Jane Smith",
      phone: "302 555 0100",
      email: "",
      eventType: "Wedding",
      eventDate: "2027-06-14",
      guestCount: 60,
      details: "",
      plan: "",
    },
    notification: { state: "pending", attempts: 0 },
    ...overrides,
  };
}

/** Minimal in-memory imitation of the Upstash commands the store uses. */
class FakeRedis {
  kv = new Map<string, { v: unknown; ttl?: number }>();
  z = new Map<string, Map<string, number>>();
  failSetOn: RegExp | null = null;

  async set(key: string, value: unknown, opts?: { nx?: boolean; ex?: number; keepTtl?: boolean }) {
    if (this.failSetOn?.test(key)) throw new Error("write failed");
    if (opts?.nx && this.kv.has(key)) return null;
    const ttl = opts?.keepTtl ? this.kv.get(key)?.ttl : opts?.ex;
    this.kv.set(key, { v: structuredClone(value), ttl });
    return "OK";
  }
  async get(key: string) {
    return this.kv.has(key) ? structuredClone(this.kv.get(key)!.v) : null;
  }
  async del(key: string) {
    return this.kv.delete(key) ? 1 : 0;
  }
  async zadd(key: string, m: { score: number; member: string }) {
    const set = this.z.get(key) ?? new Map();
    set.set(m.member, m.score);
    this.z.set(key, set);
    return 1;
  }
  async zrange(key: string, start: number, stop: number, opts?: { rev?: boolean }) {
    const entries = Array.from((this.z.get(key) ?? new Map<string, number>()).entries()).sort((a, b) => a[1] - b[1]);
    if (opts?.rev) entries.reverse();
    return entries.slice(start, stop + 1).map((e) => e[0]);
  }
  async zremrangebyscore(key: string, min: number, max: number) {
    const set = this.z.get(key);
    let n = 0;
    set?.forEach((s, m) => {
      if (s >= min && s <= max) {
        set.delete(m);
        n++;
      }
    });
    return n;
  }
}

describe("RedisLeadStore", () => {
  const make = () => {
    const redis = new FakeRedis();
    return { redis, store: new RedisLeadStore(redis as unknown as RedisLike, 90, () => NOW.getTime()) };
  };

  it("creates with retention TTL and a 24 h dedupe key", async () => {
    const { redis, store } = make();
    expect((await store.create(lead("a"))).status).toBe("created");
    expect(redis.kv.get("garnish:lead:a")?.ttl).toBe(90 * 86400);
    expect(redis.kv.get("garnish:lead:idem:key-a")?.ttl).toBe(86400);
    expect(await store.get("a")).toMatchObject({ id: "a" });
  });

  it("dedupes on the idempotency key and returns the first lead", async () => {
    const { store } = make();
    await store.create(lead("a"));
    const dup = await store.create(lead("b", { idempotencyKey: "key-a" }));
    expect(dup).toMatchObject({ status: "duplicate", lead: { id: "a" } });
    expect(await store.get("b")).toBeNull();
  });

  it("a failed record write releases the idempotency key so a retry works", async () => {
    const { redis, store } = make();
    redis.failSetOn = /^garnish:lead:a$/;
    await expect(store.create(lead("a"))).rejects.toThrow();
    expect(redis.kv.has("garnish:lead:idem:key-a")).toBe(false);
    redis.failSetOn = null;
    expect((await store.create(lead("a"))).status).toBe("created");
  });

  it("updates notification state and keeps the TTL", async () => {
    const { redis, store } = make();
    await store.create(lead("a"));
    await store.updateNotification("a", { state: "failed", attempts: 1, lastError: "timeout" });
    expect(await store.get("a")).toMatchObject({ notification: { state: "failed", lastError: "timeout" } });
    expect(redis.kv.get("garnish:lead:a")?.ttl).toBe(90 * 86400);
  });

  it("lists newest first", async () => {
    const { store } = make();
    await store.create(lead("old", { createdAt: "2026-10-01T00:00:00Z" }));
    await store.create(lead("new", { createdAt: "2026-10-09T00:00:00Z" }));
    expect((await store.list(10)).map((l) => l.id)).toEqual(["new", "old"]);
  });
});

describe("recovery", () => {
  it("re-sends failed and stale pending leads only", async () => {
    const store = new MemoryLeadStore(() => NOW.getTime());
    await store.create(lead("failed", { idempotencyKey: "1", notification: { state: "failed", attempts: 1, lastError: "timeout" } }));
    await store.create(lead("sent", { idempotencyKey: "2", notification: { state: "sent", attempts: 1 } }));
    await store.create(lead("fresh", { idempotencyKey: "3" })); // pending, just created
    await store.create(
      lead("stale", { idempotencyKey: "4", createdAt: new Date(NOW.getTime() - 10 * 60_000).toISOString() })
    );
    await store.create(lead("gaveup", { idempotencyKey: "5", notification: { state: "failed", attempts: 8 } }));

    const notifier = new MockNotifier();
    const out = await recoverLeads({ store, notifier, now: () => NOW });
    expect(out.leads.map((l) => l.id).sort()).toEqual(["failed", "stale"]);
    expect(out.sent).toBe(2);
    expect((await store.get("failed"))?.notification).toMatchObject({ state: "sent", attempts: 2 });
    // Same idempotency key as the first attempt, so Resend dedupes within 24 h.
    expect(notifier.sent.map((e) => e.idempotencyKey).sort()).toEqual(["garnish-lead-failed", "garnish-lead-stale"]);
  });

  it("dry run changes nothing", async () => {
    const store = new MemoryLeadStore(() => NOW.getTime());
    await store.create(lead("f", { notification: { state: "failed", attempts: 1 } }));
    const notifier = new MockNotifier();
    const out = await recoverLeads({ store, notifier, now: () => NOW, dryRun: true });
    expect(out.due).toBe(1);
    expect(notifier.sent).toHaveLength(0);
  });

  it("needsRecovery ignores sent leads", () => {
    expect(needsRecovery(lead("x", { notification: { state: "sent", attempts: 1 } }), NOW)).toBe(false);
  });
});

describe("recovery route", () => {
  const secret = "s".repeat(40);
  const req = (auth?: string, q = "") =>
    new Request(`http://localhost/api/leads/recover${q}`, { headers: auth ? { authorization: auth } : {} });
  const deps = (s: string | undefined) => ({
    secret: s,
    store: new MemoryLeadStore(),
    notifier: new MockNotifier(),
    now: () => NOW,
  });

  it("does not exist (404) until CRON_SECRET is set and long enough", async () => {
    expect((await handleRecover(req(`Bearer ${secret}`), deps(undefined))).status).toBe(404);
    expect((await handleRecover(req("Bearer short"), deps("short"))).status).toBe(404);
  });

  it("rejects missing or wrong credentials", async () => {
    expect((await handleRecover(req(), deps(secret))).status).toBe(401);
    expect((await handleRecover(req("Bearer " + "x".repeat(40)), deps(secret))).status).toBe(401);
  });

  it("runs with the right secret and returns no PII", async () => {
    const d = deps(secret);
    await d.store.create(lead("f", { notification: { state: "failed", attempts: 1 } }));
    const res = await handleRecover(req(`Bearer ${secret}`, "?dry=1"), d);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"due":1');
    expect(text).not.toContain("Jane");
    expect(text).not.toContain("555");
  });
});
