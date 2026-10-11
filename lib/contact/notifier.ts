import { Resend } from "resend";
import { withTimeout } from "@/lib/server/http";
import { isProductionBuild, type ServiceMode } from "@/lib/server/mode";
import type { InquiryEmail } from "./email";

export type NotifyErrorCode =
  | "config_missing" // no API key, sender or recipient
  | "config_invalid" // key rejected, or sandbox sender in production
  | "invalid_address" // provider rejected a from/to/reply-to address
  | "rejected" // other 4xx validation errors
  | "rate_limited" // 429 or a concurrent idempotent request
  | "quota_exceeded" // daily or monthly Resend quota
  | "timeout"
  | "network"
  | "provider_error" // 5xx
  | "unexpected_response";

export type NotifyResult =
  | { ok: true; providerId: string }
  | { ok: false; code: NotifyErrorCode; retryable: boolean };

export type OutgoingEmail = InquiryEmail & { idempotencyKey: string };

export interface Notifier {
  readonly kind: "resend" | "mock" | "unconfigured";
  send(email: OutgoingEmail): Promise<NotifyResult>;
}

/** The slice of the Resend SDK we call; tests pass a fake. */
export type EmailClient = {
  emails: {
    send(
      payload: { from: string; to: string[]; subject: string; html: string; text: string; replyTo?: string },
      options?: { idempotencyKey?: string }
    ): Promise<unknown>;
  };
};

export const SEND_TIMEOUT_MS = 8000;

type Env = Record<string, string | undefined>;

export type MailConfig =
  | { ok: true; apiKey: string; from: string; to: string }
  | { ok: false; code: "config_missing" | "config_invalid"; missing: string[] };

const SANDBOX_SENDER = "Garnish <onboarding@resend.dev>";

/**
 * Resolves sender and recipient. CONTACT_FROM is required in any production
 * build; Resend's sandbox sender (resend.dev) is only allowed in development,
 * because it only delivers to the Resend account owner.
 */
export function resolveMailConfig(env: Env = process.env): MailConfig {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const to = (env.ADMIN_EMAIL || env.CONTACT_TO || "").trim();
  let from = env.CONTACT_FROM?.trim() ?? "";
  const prod = isProductionBuild(env);

  if (!from && !prod) from = SANDBOX_SENDER;

  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from) missing.push("CONTACT_FROM");
  if (!to) missing.push("ADMIN_EMAIL");
  if (missing.length) return { ok: false, code: "config_missing", missing };

  if (prod && /@resend\.dev>?\s*$/i.test(from)) {
    return { ok: false, code: "config_invalid", missing: ["CONTACT_FROM (sandbox sender not allowed in production)"] };
  }
  return { ok: true, apiKey, from, to };
}

function classify(err: { name?: unknown; statusCode?: unknown; message?: unknown }): {
  code: NotifyErrorCode;
  retryable: boolean;
} {
  const name = typeof err.name === "string" ? err.name : "";
  const status = typeof err.statusCode === "number" ? err.statusCode : null;
  const message = typeof err.message === "string" ? err.message : "";

  if (name === "daily_quota_exceeded" || name === "monthly_quota_exceeded") return { code: "quota_exceeded", retryable: true };
  if (name === "rate_limit_exceeded" || status === 429) return { code: "rate_limited", retryable: true };
  if (name === "concurrent_idempotent_requests") return { code: "rate_limited", retryable: true };
  if (name === "missing_api_key" || name === "invalid_api_key" || name === "restricted_api_key" || status === 401 || status === 403)
    return { code: "config_invalid", retryable: false };
  if (name === "invalid_from_address") return { code: "invalid_address", retryable: false };
  if (
    (name === "validation_error" || name === "invalid_parameter") &&
    /\b(to|from|reply_?to)\b|e-?mail address/i.test(message)
  )
    return { code: "invalid_address", retryable: false };
  // The SDK reports a failed fetch as application_error with no status.
  if (name === "application_error" && status === null) return { code: "network", retryable: true };
  if (name === "internal_server_error" || name === "application_error" || (status !== null && status >= 500))
    return { code: "provider_error", retryable: true };
  return { code: "rejected", retryable: false };
}

export function createResendNotifier(opts: {
  client: EmailClient;
  from: string;
  to: string;
  timeoutMs?: number;
}): Notifier {
  return {
    kind: "resend",
    async send(email) {
      let result: unknown;
      try {
        result = await withTimeout(
          opts.client.emails.send(
            {
              from: opts.from,
              to: [opts.to],
              subject: email.subject,
              html: email.html,
              text: email.text,
              replyTo: email.replyTo,
            },
            { idempotencyKey: email.idempotencyKey }
          ),
          opts.timeoutMs ?? SEND_TIMEOUT_MS
        );
      } catch (err) {
        if (err instanceof Error && err.name === "TimeoutError") return { ok: false, code: "timeout", retryable: true };
        return { ok: false, code: "network", retryable: true };
      }

      if (!result || typeof result !== "object") return { ok: false, code: "unexpected_response", retryable: true };
      const { data, error } = result as { data?: unknown; error?: unknown };
      if (error && typeof error === "object") {
        const c = classify(error as Record<string, unknown>);
        return { ok: false, ...c };
      }
      const id = data && typeof data === "object" ? (data as { id?: unknown }).id : undefined;
      if (typeof id !== "string" || !id) return { ok: false, code: "unexpected_response", retryable: true };
      return { ok: true, providerId: id };
    },
  };
}

/** Records emails instead of sending them (tests, mock mode). */
export class MockNotifier implements Notifier {
  readonly kind = "mock" as const;
  readonly sent: OutgoingEmail[] = [];
  /** Queue of results to return; when empty, succeeds. */
  results: NotifyResult[] = [];

  async send(email: OutgoingEmail): Promise<NotifyResult> {
    this.sent.push(email);
    return this.results.shift() ?? { ok: true, providerId: `mock_${this.sent.length}` };
  }
}

/** Stands in for Resend when config is missing, so leads are still saved. */
export function unconfiguredNotifier(code: "config_missing" | "config_invalid"): Notifier {
  return {
    kind: "unconfigured",
    async send() {
      return { ok: false, code, retryable: false };
    },
  };
}

/**
 * Mock mode: nothing is sent and nothing is kept. GARNISH_MOCK_NOTIFY=fail
 * or =timeout simulates a provider failure for local UI checks.
 */
export function mockModeNotifier(env: Env = process.env): Notifier {
  return {
    kind: "mock",
    async send() {
      const sim = env.GARNISH_MOCK_NOTIFY;
      if (sim === "fail") return { ok: false, code: "provider_error", retryable: true };
      if (sim === "timeout") return { ok: false, code: "timeout", retryable: true };
      return { ok: true, providerId: `mock_${Date.now().toString(36)}` };
    },
  };
}

/** Builds the notifier for the current mode from env. */
export function notifierFromEnv(mode: ServiceMode, env: Env = process.env): { notifier: Notifier; config: MailConfig | null } {
  if (mode === "mock") return { notifier: mockModeNotifier(env), config: null };
  const config = resolveMailConfig(env);
  if (!config.ok) return { notifier: unconfiguredNotifier(config.code), config };
  let client: EmailClient;
  try {
    client = new Resend(config.apiKey) as unknown as EmailClient;
  } catch {
    return { notifier: unconfiguredNotifier("config_missing"), config };
  }
  return { notifier: createResendNotifier({ client, from: config.from, to: config.to }), config };
}
