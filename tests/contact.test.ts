import { describe, expect, it } from "vitest";
import { handleContact, MAX_BODY_BYTES } from "@/lib/contact/handler";
import { createResendNotifier, type EmailClient } from "@/lib/contact/notifier";
import { MemoryRateLimiter } from "@/lib/server/rateLimit";
import { NOW, contactRequest, makeDeps, uuid, validBody } from "./helpers";

async function call(req: Request, deps = makeDeps().deps) {
  const res = await handleContact(req, deps);
  return { res, body: (await res.json()) as Record<string, unknown> };
}

/** A fake Resend client: returns whatever `impl` returns. */
function fakeResend(impl: () => Promise<unknown>) {
  const calls: { payload: unknown; options: unknown }[] = [];
  const client: EmailClient = {
    emails: {
      send: (payload, options) => {
        calls.push({ payload, options });
        return impl();
      },
    },
  };
  return { client, calls };
}

describe("POST /api/contact", () => {
  it("saves the lead, notifies, and reports success (never 'delivered')", async () => {
    const { deps, store, notifier } = makeDeps();
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, notification: "sent" });
    expect(String(body.message)).toMatch(/saved/i);
    expect(String(body.message)).not.toMatch(/deliver/i);
    const [lead] = await store.list(10);
    expect(lead.notification).toMatchObject({ state: "sent", attempts: 1 });
    expect(lead.data).toMatchObject({ name: "Jane Smith", plan: "Standard", guestCount: 60 });
    expect(notifier.sent[0].idempotencyKey).toBe(`garnish-lead-${lead.id}`);
  });

  it("Resend error object: lead kept, marked failed, success-with-status (202)", async () => {
    const { client } = fakeResend(async () => ({
      data: null,
      error: { name: "validation_error", statusCode: 422, message: "Invalid `to` field." },
    }));
    const { deps, store } = makeDeps({ notifier: createResendNotifier({ client, from: "a@b.c", to: "d@e.f" }) });
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(202);
    expect(body).toMatchObject({ ok: true, notification: "failed" });
    expect(String(body.message)).toMatch(/received your request/i);
    const [lead] = await store.list(10);
    expect(lead.notification).toMatchObject({ state: "failed", attempts: 1, lastError: "invalid_address" });
  });

  it("Resend 429 is recorded as rate_limited", async () => {
    const { client } = fakeResend(async () => ({
      data: null,
      error: { name: "rate_limit_exceeded", statusCode: 429, message: "Too many requests" },
    }));
    const { deps, store } = makeDeps({ notifier: createResendNotifier({ client, from: "a@b.c", to: "d@e.f" }) });
    const { res } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(202);
    expect((await store.list(1))[0].notification.lastError).toBe("rate_limited");
  });

  it("Resend timeout: lead kept and marked failed with code timeout", async () => {
    const { client } = fakeResend(() => new Promise(() => {}));
    const { deps, store } = makeDeps({
      notifier: createResendNotifier({ client, from: "a@b.c", to: "d@e.f", timeoutMs: 20 }),
    });
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(202);
    expect(body.notification).toBe("failed");
    expect((await store.list(1))[0].notification.lastError).toBe("timeout");
  });

  it("missing mail config: lead kept, success-with-status, error code config_missing", async () => {
    const { unconfiguredNotifier } = await import("@/lib/contact/notifier");
    const { deps, store } = makeDeps({ notifier: unconfiguredNotifier("config_missing") });
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(202);
    expect(body.notification).toBe("failed");
    expect((await store.list(1))[0].notification.lastError).toBe("config_missing");
  });

  it("persistence failure: 503, no success, nothing sent", async () => {
    const { deps, store, notifier } = makeDeps();
    store.failWith = new Error("redis down");
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(503);
    expect(body.ok).toBeUndefined();
    expect(body.code).toBe("store_failed");
    expect(notifier.sent).toHaveLength(0);
  });

  it("no store configured: 503, nothing sent", async () => {
    const { deps, notifier } = makeDeps({ store: null });
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(503);
    expect(body.code).toBe("store_unavailable");
    expect(notifier.sent).toHaveLength(0);
  });

  it("status update failure after a successful send still reports the true outcome", async () => {
    const { deps, store } = makeDeps();
    const orig = store.updateNotification.bind(store);
    store.updateNotification = async () => {
      throw new Error("write failed");
    };
    const { res } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(200);
    store.updateNotification = orig;
    expect((await store.list(1))[0].notification.state).toBe("pending"); // recovery will pick it up
  });

  it("duplicate idempotency key: one lead, one email, same answer", async () => {
    const { deps, store, notifier } = makeDeps();
    const key = uuid();
    const first = await call(contactRequest(validBody(), { key }), deps);
    const second = await call(contactRequest(validBody(), { key }), deps);
    expect(first.res.status).toBe(200);
    expect(second.res.status).toBe(200);
    expect(second.body).toMatchObject({ ok: true, duplicate: true, id: first.body.id });
    expect(await store.list(10)).toHaveLength(1);
    expect(notifier.sent).toHaveLength(1);
  });

  it("missing or malformed idempotency key is rejected before anything is stored", async () => {
    const { deps, store } = makeDeps();
    expect((await call(contactRequest(validBody(), { key: null }), deps)).res.status).toBe(400);
    expect((await call(contactRequest(validBody(), { key: "not-a-uuid" }), deps)).res.status).toBe(400);
    expect(await store.list(10)).toHaveLength(0);
  });

  it("rate limit: sixth request in an hour from one visitor gets 429", async () => {
    const { deps } = makeDeps();
    for (let i = 0; i < 5; i++) expect((await call(contactRequest(validBody()), deps)).res.status).toBe(200);
    const { res, body } = await call(contactRequest(validBody()), deps);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(body.code).toBe("rate_limited");
    // Another visitor is unaffected.
    expect((await call(contactRequest(validBody(), { ip: "198.51.100.9" }), deps)).res.status).toBe(200);
  });

  it("rate limiter keys are hashed, never the raw IP", async () => {
    const seen: string[] = [];
    const { deps } = makeDeps({
      limiter: { limit: async (k) => (seen.push(k), { success: true, limit: 5, remaining: 4, reset: 0 }) },
      hashIp: (ip) => `hashed(${ip.length})`,
    });
    await call(contactRequest(validBody()), deps);
    expect(seen[0]).not.toContain("203.0.113.7");
  });

  it("global daily cap applies across visitors", async () => {
    const { deps } = makeDeps({ globalLimiter: new MemoryRateLimiter(1, 86_400_000, () => NOW.getTime()) });
    expect((await call(contactRequest(validBody()), deps)).res.status).toBe(200);
    expect((await call(contactRequest(validBody(), { ip: "198.51.100.1" }), deps)).res.status).toBe(429);
  });

  it("rate limiter outage fails open (inquiry still saved)", async () => {
    const { deps, store } = makeDeps({
      limiter: { limit: async () => { throw new Error("redis timeout"); } },
    });
    expect((await call(contactRequest(validBody()), deps)).res.status).toBe(200);
    expect(await store.list(1)).toHaveLength(1);
  });

  it("honeypot: looks like success, stores and sends nothing", async () => {
    const { deps, store, notifier } = makeDeps();
    const { res, body } = await call(contactRequest(validBody({ website: "http://spam.example" })), deps);
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(await store.list(10)).toHaveLength(0);
    expect(notifier.sent).toHaveLength(0);
  });

  it("minimum fill time: too fast is an error, not a fake success", async () => {
    const { deps, store } = makeDeps();
    const { res, body } = await call(contactRequest(validBody({ startedAt: NOW.getTime() - 500 })), deps);
    expect(res.status).toBe(400);
    expect(body.code).toBe("too_fast");
    const missing = await call(contactRequest(validBody({ startedAt: undefined })), deps);
    expect(missing.res.status).toBe(400);
    expect(await store.list(10)).toHaveLength(0);
  });

  it("dates are judged in America/New_York: past and too-far dates fail", async () => {
    const { deps } = makeDeps();
    const past = await call(contactRequest(validBody({ eventDate: "2026-10-09" })), deps);
    expect(past.res.status).toBe(422);
    expect((past.body.fields as Record<string, string>).eventDate).toMatch(/today onward/);
    const far = await call(contactRequest(validBody({ eventDate: "2030-01-01" })), deps);
    expect(far.res.status).toBe(422);
    const bogus = await call(contactRequest(validBody({ eventDate: "2027-02-30" })), deps);
    expect(bogus.res.status).toBe(422);
    const today = await call(contactRequest(validBody({ eventDate: "2026-10-10" })), deps);
    expect(today.res.status).toBe(200);
  });

  it("after 8 pm New York, 'today' is still the New York date (not UTC's tomorrow)", async () => {
    // 2026-10-11 01:30 UTC = 2026-10-10 21:30 in New York.
    const late = new Date("2026-10-11T01:30:00Z");
    const { deps } = makeDeps({ now: () => late });
    const { res } = await call(contactRequest(validBody({ eventDate: "2026-10-10", startedAt: late.getTime() - 60_000 })), deps);
    expect(res.status).toBe(200);
  });

  it("invalid fields return 422 with per-field messages", async () => {
    const { deps } = makeDeps();
    const { res, body } = await call(
      contactRequest(validBody({ name: "", phone: "call me", email: "nope", guestCount: "0", eventType: "Rave", plan: "Gold" })),
      deps
    );
    expect(res.status).toBe(422);
    expect(Object.keys(body.fields as object).sort()).toEqual(["email", "eventType", "guestCount", "name", "phone", "plan"]);
  });

  it("plan spellings from the URL are normalised", async () => {
    const { deps, store } = makeDeps();
    await call(contactRequest(validBody({ plan: "Bartender DJ" })), deps);
    expect((await store.list(1))[0].data.plan).toBe("Bartender + DJ");
  });

  it("oversized body: 413 before parsing", async () => {
    const { deps, store } = makeDeps();
    const big = validBody({ details: "x".repeat(MAX_BODY_BYTES) });
    const { res } = await call(contactRequest(big), deps);
    expect(res.status).toBe(413);
    expect(await store.list(10)).toHaveLength(0);
  });

  it("non-JSON content type: 415; malformed JSON: 400", async () => {
    const { deps } = makeDeps();
    expect((await call(contactRequest(validBody(), { contentType: "text/plain" }), deps)).res.status).toBe(415);
    expect((await call(contactRequest(null, { raw: "{not json" }), deps)).res.status).toBe(400);
  });

  it("HTML injection is escaped in the email, including attributes", async () => {
    const { deps, notifier } = makeDeps();
    await call(
      contactRequest(
        validBody({
          name: `<img src=x onerror=alert(1)> "Bob"`,
          details: `</p><script>alert('x')</script><a href="javascript:alert(1)">hi</a>`,
          email: "",
        })
      ),
      deps
    );
    const html = notifier.sent[0].html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt; &quot;Bob&quot;");
    expect(html).toContain("&lt;/p&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    // The tel: link carries digits only, so a crafted phone cannot break out of href="".
    expect(html).toMatch(/href="tel:\+13025550100"/);
  });

  it("the email subject carries no line breaks (header injection)", async () => {
    const { deps, notifier } = makeDeps();
    await call(contactRequest(validBody({ name: "Eve\r\nBcc: x@evil.test" })), deps);
    expect(notifier.sent[0].subject).not.toMatch(/[\r\n]/);
  });

  it("the stored lead holds no IP or user agent", async () => {
    const { deps, store } = makeDeps();
    await call(contactRequest(validBody()), deps);
    const serialised = JSON.stringify(await store.list(1));
    expect(serialised).not.toContain("203.0.113.7");
  });
  it("omitted or wrongly typed fields get clean messages, never zod internals (same 422 contract)", async () => {
    const body: Record<string, unknown> = validBody({ guestCount: true, name: 42 });
    delete body.email;
    delete body.details;
    delete body.plan;
    const { res, body: out } = await call(contactRequest(body));
    expect(res.status).toBe(422);
    expect(out.code).toBe("invalid_fields");
    const fields = out.fields as Record<string, string>;
    expect(Object.keys(fields).sort()).toEqual(["details", "email", "guestCount", "name", "plan"]);
    for (const m of Object.values(fields)) {
      expect(m).not.toMatch(/invalid input|expected|received|nonoptional/i);
    }
    expect(fields.plan).toBe("Please choose one of the packages.");
  });
});
