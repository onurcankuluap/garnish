import { getRedis } from "@/lib/server/redis";
import { MemoryRateLimiter, hashIp, upstashLimiter, type RateLimiter } from "@/lib/server/rateLimit";
import { serviceMode } from "@/lib/server/mode";
import { log } from "@/lib/server/log";
import type { ChatDeps, Upstream } from "./handler";

type Env = Record<string, string | undefined>;

const LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+(\/|$)/;

/** Canned local reply: mock mode never reaches the real AI backend. */
export const mockUpstream: Upstream = async (message) => {
  await new Promise((r) => setTimeout(r, 150));
  return new Response(
    JSON.stringify({
      reply: `Test mode: this is a canned reply, not the AI concierge. You asked about "${message.slice(0, 60)}". For real answers, send an inquiry or call.`,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

function httpUpstream(url: string, secret?: string): Upstream {
  return (message, signal) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Only sent once the owner sets it; the AWS side must verify it (see report).
        ...(secret ? { "X-Garnish-Secret": secret } : {}),
      },
      body: JSON.stringify({ message }),
      cache: "no-store",
      signal,
    });
}

let mockLimiters: { visitor: RateLimiter; global: RateLimiter } | null = null;

export function chatDepsFromEnv(env: Env = process.env): ChatDeps {
  const mode = serviceMode(env);
  const base = { hashIp: (ip: string) => hashIp(ip, env.RATE_LIMIT_SALT), now: () => Date.now() };

  if (mode === "mock") {
    mockLimiters ??= {
      visitor: new MemoryRateLimiter(12, 60_000),
      global: new MemoryRateLimiter(1000, 86_400_000),
    };
    const mockUrl = env.GARNISH_AI_MOCK_URL?.trim();
    let upstream: Upstream = mockUpstream;
    if (mockUrl) {
      if (LOOPBACK.test(mockUrl)) upstream = httpUpstream(mockUrl);
      else log.error("chat_mock_url_not_loopback");
    }
    return { ...base, limiter: mockLimiters.visitor, globalLimiter: mockLimiters.global, upstream };
  }

  const redis = getRedis(env);
  const url = env.GARNISH_AI_API_URL?.trim();
  let upstream: Upstream | null = null;
  if (url && url.startsWith("https://")) upstream = httpUpstream(url, env.GARNISH_AI_SHARED_SECRET?.trim() || undefined);
  else if (url) log.error("chat_upstream_not_https");

  return {
    ...base,
    limiter: redis ? upstashLimiter(redis, "garnish:chat", 12, "60 s") : null,
    globalLimiter: redis ? upstashLimiter(redis, "garnish:chat:global", 1000, "1 d", "fixed") : null,
    upstream,
  };
}
