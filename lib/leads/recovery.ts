import { buildInquiryEmail } from "@/lib/contact/email";
import type { Notifier, NotifyResult } from "@/lib/contact/notifier";
import { log } from "@/lib/server/log";
import type { LeadRecord, LeadStore, NotificationStatus } from "./types";

/** Resend idempotency key for a lead's owner notification (stable across retries). */
export const notifyKey = (lead: LeadRecord) => `garnish-lead-${lead.id}`;

export const MAX_ATTEMPTS = 8;
/** A lead still "pending" after this long lost its first attempt (crash or timeout). */
export const STALE_PENDING_MS = 5 * 60 * 1000;

/**
 * Sends (or re-sends) the owner notification for a lead, then records the
 * outcome. Never throws for a provider failure; a failure to record the
 * outcome is logged and leaves the lead "pending" for the next recovery run.
 */
export async function notifyLead(
  lead: LeadRecord,
  deps: { store: LeadStore; notifier: Notifier; now: () => Date }
): Promise<{ result: NotifyResult; notification: NotificationStatus }> {
  const email = buildInquiryEmail(lead);
  let result: NotifyResult;
  try {
    result = await deps.notifier.send({ ...email, idempotencyKey: notifyKey(lead) });
  } catch {
    result = { ok: false, code: "network", retryable: true };
  }

  const notification: NotificationStatus = {
    state: result.ok ? "sent" : "failed",
    attempts: lead.notification.attempts + 1,
    lastAttemptAt: deps.now().toISOString(),
    ...(result.ok ? { providerId: result.providerId } : { lastError: result.code }),
  };

  try {
    await deps.store.updateNotification(lead.id, notification);
  } catch {
    log.error("lead_status_update_failed", { leadId: lead.id, state: notification.state });
  }

  if (!result.ok) log.error("lead_notify_failed", { leadId: lead.id, code: result.code, attempt: notification.attempts });
  return { result, notification };
}

export function needsRecovery(lead: LeadRecord, now: Date): boolean {
  const n = lead.notification;
  if (n.state === "sent" || n.attempts >= MAX_ATTEMPTS) return false;
  if (n.state === "failed") return true;
  const since = Date.parse(n.lastAttemptAt ?? lead.createdAt);
  return now.getTime() - since > STALE_PENDING_MS;
}

export type LeadSummary = {
  id: string;
  createdAt: string;
  state: NotificationStatus["state"];
  attempts: number;
  lastError?: string;
};

/** A PII-free view of a lead, safe for an admin listing or logs. */
export function summarise(lead: LeadRecord): LeadSummary {
  return {
    id: lead.id,
    createdAt: lead.createdAt,
    state: lead.notification.state,
    attempts: lead.notification.attempts,
    lastError: lead.notification.lastError,
  };
}

/** Re-sends notifications for failed and stale-pending leads. */
export async function recoverLeads(deps: {
  store: LeadStore;
  notifier: Notifier;
  now: () => Date;
  scan?: number;
  dryRun?: boolean;
}) {
  const leads = await deps.store.list(deps.scan ?? 200);
  const due = leads.filter((l) => needsRecovery(l, deps.now()));
  const outcome = { scanned: leads.length, due: due.length, sent: 0, failed: 0, dryRun: Boolean(deps.dryRun), leads: [] as LeadSummary[] };
  for (const lead of due) {
    if (deps.dryRun) {
      outcome.leads.push(summarise(lead));
      continue;
    }
    const { result, notification } = await notifyLead(lead, deps);
    if (result.ok) outcome.sent++;
    else outcome.failed++;
    outcome.leads.push(summarise({ ...lead, notification }));
  }
  return outcome;
}
