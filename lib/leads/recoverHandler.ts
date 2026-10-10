import { timingSafeEqual } from "node:crypto";
import { json } from "@/lib/server/http";
import type { Notifier } from "@/lib/contact/notifier";
import type { LeadStore } from "./types";
import { recoverLeads } from "./recovery";

/** Minimum secret length; shorter secrets keep the route disabled. */
export const MIN_SECRET_LENGTH = 32;

function authorised(req: Request, secret: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Protected recovery endpoint (Vercel Cron compatible: cron sends GET with
 * `Authorization: Bearer $CRON_SECRET`).
 *
 *   GET ?dry=1  list leads that need a notification re-sent (no PII)
 *   GET         re-send them
 *
 * Returns 404 unless CRON_SECRET is configured, so it does not exist until the
 * owner turns it on. Responses carry ids, states and error codes only.
 */
export async function handleRecover(
  req: Request,
  deps: { secret: string | undefined; store: LeadStore | null; notifier: Notifier; now: () => Date }
): Promise<Response> {
  const secret = deps.secret ?? "";
  if (secret.length < MIN_SECRET_LENGTH) return json({ error: "Not found." }, 404);
  if (!authorised(req, secret)) return json({ error: "Unauthorized." }, 401, { "WWW-Authenticate": "Bearer" });
  if (!deps.store) return json({ error: "Lead store not configured.", code: "store_unavailable" }, 503);

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const outcome = await recoverLeads({ store: deps.store, notifier: deps.notifier, now: deps.now, dryRun });
    return json(outcome);
  } catch {
    return json({ error: "Recovery failed.", code: "store_failed" }, 503);
  }
}
