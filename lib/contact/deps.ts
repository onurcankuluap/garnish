import { randomUUID } from "node:crypto";
import { MemoryLeadStore } from "@/lib/leads/memoryStore";
import { RedisLeadStore } from "@/lib/leads/redisStore";
import { retentionDays, type LeadStore } from "@/lib/leads/types";
import { getRedis } from "@/lib/server/redis";
import { MemoryRateLimiter, hashIp, upstashLimiter, type RateLimiter } from "@/lib/server/rateLimit";
import { serviceMode, type ServiceMode } from "@/lib/server/mode";
import { log } from "@/lib/server/log";
import { notifierFromEnv, type Notifier } from "./notifier";
import type { ContactDeps } from "./handler";

type Env = Record<string, string | undefined>;

let mockState: { store: MemoryLeadStore; limiter: MemoryRateLimiter; global: MemoryRateLimiter } | null = null;

/** Mock-mode store; GARNISH_MOCK_STORE=fail simulates an outage for UI checks. */
function mockStore(env: Env): LeadStore {
  mockState ??= {
    store: new MemoryLeadStore(),
    limiter: new MemoryRateLimiter(5, 60 * 60 * 1000),
    global: new MemoryRateLimiter(100, 24 * 60 * 60 * 1000),
  };
  mockState.store.failWith = env.GARNISH_MOCK_STORE === "fail" ? new Error("mock_store_failure") : null;
  return mockState.store;
}

export function storeFromEnv(mode: ServiceMode, env: Env = process.env): LeadStore | null {
  if (mode === "mock") return mockStore(env);
  const redis = getRedis(env);
  return redis ? new RedisLeadStore(redis, retentionDays(env)) : null;
}

export function contactDepsFromEnv(env: Env = process.env): ContactDeps {
  const mode = serviceMode(env);
  const { notifier, config } = notifierFromEnv(mode, env);
  if (config && !config.ok) log.error("contact_mail_config", { code: config.code, missing: config.missing.join(",") });

  let limiter: RateLimiter | null = null;
  let globalLimiter: RateLimiter | null = null;
  if (mode === "mock") {
    mockStore(env);
    limiter = mockState!.limiter;
    globalLimiter = mockState!.global;
  } else {
    const redis = getRedis(env);
    if (redis) {
      limiter = upstashLimiter(redis, "garnish:contact", 5, "1 h");
      globalLimiter = upstashLimiter(redis, "garnish:contact:global", 100, "1 d", "fixed");
    } else {
      log.error("contact_redis_unconfigured");
    }
  }
  if (mode === "live" && !env.RATE_LIMIT_SALT) log.warn("rate_limit_salt_missing");

  return {
    mode,
    store: storeFromEnv(mode, env),
    notifier: notifier as Notifier,
    limiter,
    globalLimiter,
    hashIp: (ip) => hashIp(ip, env.RATE_LIMIT_SALT),
    now: () => new Date(),
    newId: () => randomUUID(),
  };
}
