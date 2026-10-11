import type { Redis } from "@upstash/redis";
import { withTimeout } from "@/lib/server/http";
import {
  IDEMPOTENCY_WINDOW_SECONDS,
  type CreateResult,
  type LeadRecord,
  type LeadStore,
  type NotificationStatus,
} from "./types";

/** The subset of the Upstash client this store uses (lets tests pass a fake). */
export type RedisLike = Pick<Redis, "get" | "set" | "del" | "zadd" | "zrange" | "zremrangebyscore">;

const PREFIX = "garnish:lead";
const leadKey = (id: string) => `${PREFIX}:${id}`;
const idemKey = (key: string) => `${PREFIX}:idem:${key}`;
const INDEX = `${PREFIX}s:index`; // sorted set: score = createdAt ms, member = id

const OP_TIMEOUT_MS = 4000;

/**
 * Durable LeadStore on Upstash Redis.
 *
 * Layout:
 *   garnish:lead:<id>            JSON record, TTL = retention
 *   garnish:lead:idem:<key>      id, SET NX, TTL = 24 h (dedupe window)
 *   garnish:leads:index          sorted set of ids by createdAt (pruned to retention)
 *
 * Upstash persists every write to block storage (eviction must stay OFF on
 * the database; it is off by default).
 */
export class RedisLeadStore implements LeadStore {
  constructor(
    private readonly redis: RedisLike,
    private readonly retentionDays: number,
    private readonly now: () => number = Date.now
  ) {}

  private get ttl() {
    return this.retentionDays * 24 * 60 * 60;
  }

  async create(lead: LeadRecord): Promise<CreateResult> {
    const claimed = await withTimeout(
      this.redis.set(idemKey(lead.idempotencyKey), lead.id, { nx: true, ex: IDEMPOTENCY_WINDOW_SECONDS }),
      OP_TIMEOUT_MS
    );
    if (claimed === null) {
      const existingId = await withTimeout(this.redis.get<string>(idemKey(lead.idempotencyKey)), OP_TIMEOUT_MS);
      const existing = existingId ? await this.get(existingId) : null;
      return { status: "duplicate", lead: existing };
    }

    try {
      await withTimeout(this.redis.set(leadKey(lead.id), lead, { ex: this.ttl }), OP_TIMEOUT_MS);
    } catch (err) {
      // Release the key so the visitor's retry is not treated as a duplicate.
      await this.redis.del(idemKey(lead.idempotencyKey)).catch(() => {});
      throw err;
    }

    // The index only speeds up recovery; the record itself is already safe.
    const t = Date.parse(lead.createdAt);
    await withTimeout(
      Promise.all([
        this.redis.zadd(INDEX, { score: t, member: lead.id }),
        this.redis.zremrangebyscore(INDEX, 0, this.now() - this.ttl * 1000),
      ]),
      OP_TIMEOUT_MS
    ).catch(() => {});

    return { status: "created", lead };
  }

  async get(id: string): Promise<LeadRecord | null> {
    const raw = await withTimeout(this.redis.get<LeadRecord | string>(leadKey(id)), OP_TIMEOUT_MS);
    if (raw === null || raw === undefined) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as LeadRecord) : raw;
  }

  async updateNotification(id: string, notification: NotificationStatus): Promise<void> {
    const lead = await this.get(id);
    if (!lead) throw new Error("lead_not_found");
    lead.notification = notification;
    await withTimeout(this.redis.set(leadKey(id), lead, { keepTtl: true }), OP_TIMEOUT_MS);
  }

  async list(limit: number): Promise<LeadRecord[]> {
    const ids = (await withTimeout(this.redis.zrange<string[]>(INDEX, 0, limit - 1, { rev: true }), OP_TIMEOUT_MS)) ?? [];
    const leads = await Promise.all(ids.map((id) => this.get(String(id))));
    return leads.filter((l): l is LeadRecord => l !== null);
  }
}
