import { notifyLead } from "@/lib/leads/recovery";
import type { LeadRecord, LeadStore, NotificationState } from "@/lib/leads/types";
import type { Notifier } from "./notifier";
import { validateInquiry } from "./schema";
import { clientIp, json, readJsonBody } from "@/lib/server/http";
import type { RateLimiter } from "@/lib/server/rateLimit";
import type { ServiceMode } from "@/lib/server/mode";
import { log } from "@/lib/server/log";

export const MAX_BODY_BYTES = 16 * 1024;
/** Faster than this from first render to submit is treated as automated. */
export const MIN_FILL_MS = 3000;
/** A form older than this must be reloaded (keeps idempotency keys fresh). */
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ContactDeps = {
  mode: ServiceMode;
  /** null when storage is not configured: the route then refuses inquiries. */
  store: LeadStore | null;
  notifier: Notifier;
  /** Per-visitor limit (5/hour). null = unconfigured (logged, allowed). */
  limiter: RateLimiter | null;
  /** Site-wide daily cap. */
  globalLimiter: RateLimiter | null;
  hashIp: (ip: string) => string;
  now: () => Date;
  newId: () => string;
};

/** Messages the visitor sees. Never claim delivery: Resend accepting a request is not delivery. */
export const COPY = {
  saved: "Your inquiry is saved. Expect a call within 24 hours to talk through your event.",
  savedNotifyFailed:
    "We've received your request and saved it. Our notification is delayed, so we'll confirm by phone or email. If you haven't heard from us within 24 hours, please call.",
  storeFailed:
    "We couldn't save your inquiry, so nothing was sent. Your answers are still here: please try again in a moment, or call instead.",
  unavailable: "Online inquiries are temporarily unavailable. Please call instead; nothing was sent.",
  rateLimited: "Too many submissions from your connection. Please try again later, or call instead.",
  tooFast: "That was quick! Please check your details, then send the form again.",
  staleForm: "This form has been open a long time. Please refresh the page and try again.",
  missingKey: "Please refresh the page and try again.",
  invalid: "Please check the highlighted fields.",
  inProgress: "Your inquiry is already being saved. Please wait a moment before trying again.",
};

type Body = Record<string, unknown>;

export async function handleContact(req: Request, deps: ContactDeps): Promise<Response> {
  const ipKey = deps.hashIp(clientIp(req));

  // 1. Rate limits (per visitor, then site-wide). Fail open on limiter errors:
  //    a Redis hiccup must not block a real inquiry; storage below fails closed.
  for (const [limiter, scope] of [
    [deps.limiter, ipKey],
    [deps.globalLimiter, "global"],
  ] as const) {
    if (!limiter) continue;
    try {
      const r = await limiter.limit(scope);
      if (!r.success) {
        const retryAfter = Math.max(1, Math.ceil((r.reset - deps.now().getTime()) / 1000));
        log.warn("contact_rate_limited", { scope: scope === "global" ? "global" : "visitor" });
        return json({ error: COPY.rateLimited, code: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });
      }
    } catch {
      log.error("contact_rate_limit_unavailable", { scope: scope === "global" ? "global" : "visitor" });
    }
  }

  // 2. Body: JSON, at most 16 KB.
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (!body.ok) return json({ error: body.error, code: body.code }, body.status);
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return json({ error: "Invalid request.", code: "invalid_json" }, 400);
  }
  const input = body.value as Body;

  // 3. Honeypot: a hidden field only bots fill. Answer like a success so the
  //    bot learns nothing; nothing is stored or sent.
  if (typeof input.website === "string" && input.website.trim() !== "") {
    log.info("contact_honeypot");
    return json({ ok: true, notification: "sent", id: deps.newId(), mode: deps.mode });
  }

  // 4. Minimum fill time. Shown as an error (not a fake success) so a fast
  //    human with autofill can simply resend.
  const startedAt = typeof input.startedAt === "number" ? input.startedAt : NaN;
  const elapsed = deps.now().getTime() - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return json({ error: COPY.tooFast, code: "too_fast" }, 400);
  }
  if (elapsed > MAX_FORM_AGE_MS) return json({ error: COPY.staleForm, code: "stale_form" }, 400);

  // 5. Idempotency key: one UUID per form session, sent as a header.
  const idempotencyKey = req.headers.get("idempotency-key")?.trim() ?? "";
  if (!UUID.test(idempotencyKey)) return json({ error: COPY.missingKey, code: "missing_idempotency_key" }, 400);

  // 6. Validation.
  const v = validateInquiry(input, deps.now());
  if (!v.ok) return json({ error: COPY.invalid, code: "invalid_fields", fields: v.fields }, 422);

  // 7. Persist first. Without durable storage there is no success.
  if (!deps.store) {
    log.error("contact_store_unconfigured");
    return json({ error: COPY.unavailable, code: "store_unavailable" }, 503);
  }

  const lead: LeadRecord = {
    v: 1,
    id: deps.newId(),
    idempotencyKey: idempotencyKey.toLowerCase(),
    createdAt: deps.now().toISOString(),
    data: v.data,
    notification: { state: "pending", attempts: 0 },
  };

  let created;
  try {
    created = await deps.store.create(lead);
  } catch {
    log.error("contact_store_failed");
    return json({ error: COPY.storeFailed, code: "store_failed" }, 503);
  }

  if (created.status === "duplicate") {
    const existing = created.lead;
    log.info("contact_duplicate", { leadId: existing?.id ?? null });
    if (!existing) return json({ error: COPY.inProgress, code: "in_progress" }, 409);
    return successResponse(existing.id, existing.notification.state, deps.mode, true);
  }

  // 8. Notify, then record the outcome.
  const { result } = await notifyLead(created.lead, { store: deps.store, notifier: deps.notifier, now: deps.now });
  log.info("contact_saved", { leadId: lead.id, notified: result.ok, notifier: deps.notifier.kind });
  return successResponse(lead.id, result.ok ? "sent" : "failed", deps.mode, false);
}

function successResponse(id: string, notification: NotificationState, mode: ServiceMode, duplicate: boolean) {
  return json(
    {
      ok: true,
      id,
      ref: id.slice(0, 8).toUpperCase(),
      notification,
      message: notification === "sent" ? COPY.saved : COPY.savedNotifyFailed,
      duplicate,
      mode,
    },
    notification === "sent" ? 200 : 202
  );
}
