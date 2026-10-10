import type { InquiryData } from "@/lib/contact/schema";

export type NotificationState = "pending" | "sent" | "failed";

export type NotificationStatus = {
  state: NotificationState;
  attempts: number;
  /** An error CODE only (e.g. "timeout", "rate_limited"); never provider text or PII. */
  lastError?: string;
  lastAttemptAt?: string;
  /** Resend's message id once the provider accepted the email (not delivery). */
  providerId?: string;
};

/**
 * One inquiry. Holds only what is needed to call the visitor back: the
 * validated form fields. No IP, user agent or other tracking data.
 */
export type LeadRecord = {
  v: 1;
  id: string;
  idempotencyKey: string;
  createdAt: string; // ISO 8601, UTC
  data: InquiryData;
  notification: NotificationStatus;
};

export type CreateResult =
  | { status: "created"; lead: LeadRecord }
  /** Same idempotency key seen in the dedupe window. `lead` is null while the first request is still writing. */
  | { status: "duplicate"; lead: LeadRecord | null };

export interface LeadStore {
  /** Persists a new lead unless its idempotency key was already used. Throws on storage failure. */
  create(lead: LeadRecord): Promise<CreateResult>;
  get(id: string): Promise<LeadRecord | null>;
  updateNotification(id: string, notification: NotificationStatus): Promise<void>;
  /** Newest first. */
  list(limit: number): Promise<LeadRecord[]>;
}

/** Dedupe window for idempotency keys (matches Resend's 24 h key lifetime). */
export const IDEMPOTENCY_WINDOW_SECONDS = 24 * 60 * 60;

/** Default retention for lead records (owner decision; see STAGE1-REPORT.md). */
export const DEFAULT_RETENTION_DAYS = 90;

export function retentionDays(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.LEAD_RETENTION_DAYS);
  return Number.isInteger(n) && n >= 7 && n <= 730 ? n : DEFAULT_RETENTION_DAYS;
}
