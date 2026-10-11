import { createHmac, createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";

export type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms
};

export interface RateLimiter {
  limit(key: string): Promise<LimitResult>;
}

/**
 * Hashes a visitor IP so no readable IP is ever stored as a Redis key.
 * With RATE_LIMIT_SALT set this is an HMAC; without it a plain SHA-256,
 * which still hides the IP from a casual reader but is brute-forceable.
 */
export function hashIp(ip: string, salt: string | undefined): string {
  const digest = salt
    ? createHmac("sha256", salt).update(ip).digest("hex")
    : createHash("sha256").update(`garnish:${ip}`).digest("hex");
  return digest.slice(0, 32);
}

/** Sliding-window limiter for tests and mock mode (one process only). */
export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now
  ) {}

  async limit(key: string): Promise<LimitResult> {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => x > t - this.windowMs);
    const success = recent.length < this.max;
    if (success) recent.push(t);
    this.hits.set(key, recent);
    return {
      success,
      limit: this.max,
      remaining: Math.max(0, this.max - recent.length),
      reset: (recent[0] ?? t) + this.windowMs,
    };
  }
}

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

/**
 * Upstash limiter. `timeout` makes it fail open (allow) if Redis does not
 * answer in time, so a Redis outage never blocks a real visitor; the lead
 * store is what fails closed. Analytics stay off (they would store
 * per-identifier data).
 */
export function upstashLimiter(
  redis: Redis,
  prefix: string,
  max: number,
  window: Window,
  kind: "sliding" | "fixed" = "sliding"
): RateLimiter {
  const rl = new Ratelimit({
    redis,
    prefix,
    limiter: kind === "sliding" ? Ratelimit.slidingWindow(max, window) : Ratelimit.fixedWindow(max, window),
    analytics: false,
    timeout: 1500,
  });
  return {
    async limit(key) {
      const r = await rl.limit(key);
      return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
    },
  };
}
