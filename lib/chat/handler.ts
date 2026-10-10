import { clientIp, json, readJsonBody } from "@/lib/server/http";
import type { RateLimiter } from "@/lib/server/rateLimit";
import { log } from "@/lib/server/log";

export const MAX_MESSAGE_CHARS = 3000;
export const MAX_REPLY_CHARS = 4000;
export const MAX_BODY_BYTES = 16 * 1024;
export const UPSTREAM_TIMEOUT_MS = 10_000;

/** Calls the AI backend with { message }. Must honour `signal`. */
export type Upstream = (message: string, signal: AbortSignal) => Promise<Response>;

export type ChatDeps = {
  /** null: no limiter configured. Live mode fails closed (503) as before. */
  limiter: RateLimiter | null;
  globalLimiter: RateLimiter | null;
  /** null: upstream not configured. */
  upstream: Upstream | null;
  hashIp: (ip: string) => string;
  now: () => number;
  timeoutMs?: number;
};

const rateHeaders = (r: { limit: number; remaining: number; reset: number }) => ({
  "X-RateLimit-Limit": String(r.limit),
  "X-RateLimit-Remaining": String(r.remaining),
  "X-RateLimit-Reset": String(r.reset),
});

/**
 * POST /api/chat  { message: string <= 3000 }  ->  200 { reply } | 4xx/5xx { error }
 * The contract is unchanged; errors are structured and never echo input.
 */
export async function handleChat(req: Request, deps: ChatDeps): Promise<Response> {
  if (!deps.limiter) {
    log.error("chat_rate_limiter_unavailable");
    return json({ error: "Chat service is temporarily unavailable" }, 503);
  }

  let r;
  try {
    r = await deps.limiter.limit(deps.hashIp(clientIp(req)));
    if (r.success && deps.globalLimiter) {
      const g = await deps.globalLimiter.limit("global");
      if (!g.success) {
        log.warn("chat_global_cap");
        return json({ error: "The concierge is resting for today. Please call or send an inquiry." }, 429, {
          "Retry-After": String(Math.max(1, Math.ceil((g.reset - deps.now()) / 1000))),
        });
      }
    }
  } catch {
    log.error("chat_rate_limiter_error");
    return json({ error: "Chat service is temporarily unavailable" }, 503);
  }
  if (!r.success) {
    return json({ error: "Too many requests. Please try again shortly." }, 429, {
      "Retry-After": String(Math.max(1, Math.ceil((r.reset - deps.now()) / 1000))),
      ...rateHeaders(r),
    });
  }

  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (!body.ok) return json({ error: body.status === 413 ? "Message is too long" : body.error }, body.status);
  const raw = (body.value as { message?: unknown } | null)?.message;
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message) return json({ error: "Message is required" }, 400);
  if (message.length > MAX_MESSAGE_CHARS) return json({ error: "Message is too long" }, 400);

  if (!deps.upstream) {
    log.error("chat_upstream_unconfigured");
    return json({ error: "Chat service is unavailable" }, 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? UPSTREAM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await deps.upstream(message, controller.signal);
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
      log.error("chat_upstream_timeout");
      return json({ error: "Chat service timed out" }, 504);
    }
    log.error("chat_upstream_network");
    return json({ error: "Chat service is temporarily unavailable" }, 502);
  }
  clearTimeout(timer);

  if (!res.ok) {
    log.error("chat_upstream_status", { status: res.status });
    return json({ error: "Chat service is temporarily unavailable" }, 502);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    log.error("chat_upstream_bad_json");
    return json({ error: "Chat service is temporarily unavailable" }, 502);
  }
  const reply = (data as { reply?: unknown } | null)?.reply;
  if (typeof reply !== "string" || !reply.trim()) {
    log.error("chat_upstream_bad_shape");
    return json({ error: "Chat service is temporarily unavailable" }, 502);
  }

  return json({ reply: reply.trim().slice(0, MAX_REPLY_CHARS) }, 200, rateHeaders(r));
}
