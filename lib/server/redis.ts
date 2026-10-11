import { Redis } from "@upstash/redis";

type Env = Record<string, string | undefined>;

let cached: { url: string; client: Redis } | null = null;

/**
 * The shared Upstash client, from the Vercel Marketplace names
 * (KV_REST_API_URL/_TOKEN) or Upstash's own (UPSTASH_REDIS_REST_URL/_TOKEN).
 * Returns null when not configured.
 */
export function getRedis(env: Env = process.env): Redis | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (cached?.url === url) return cached.client;
  const client = new Redis({ url, token, retry: { retries: 2 } });
  cached = { url, client };
  return client;
}
