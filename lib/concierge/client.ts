import { extractSelection, guardReply, intents, localAnswer, type Answer } from "./grounding";

/**
 * Client wrapper around POST /api/chat. The request and response contract is
 * unchanged ({ message } -> { reply } | { error }); this only decides whether
 * a question needs the AI at all, and how to present failures.
 */
export const MAX_INPUT_CHARS = 600;
export const CLIENT_TIMEOUT_MS = 15_000;

export type AskFailure = {
  ok: false;
  kind: "empty" | "too_long" | "offline" | "rate_limited" | "timeout" | "unavailable" | "network";
  message: string;
  retryAfter?: number;
  /** Worth offering "Try again" for the same message. */
  retry: boolean;
};

export type AskResult = { ok: true; answer: Answer } | AskFailure;

const fail = (kind: AskFailure["kind"], message: string, retry: boolean, retryAfter?: number): AskFailure => ({
  ok: false,
  kind,
  message,
  retry,
  ...(retryAfter ? { retryAfter } : {}),
});

export const FAILURE_COPY = {
  empty: "Type a question first.",
  tooLong: `Please keep questions under ${MAX_INPUT_CHARS} characters.`,
  offline: "You're offline, so I can't answer that right now. Check your date or call once you're back online.",
  rateLimited: "That's a lot of questions in a short time. Please wait a moment, or call instead.",
  timeout: "The assistant took too long to answer. Try again, or call instead.",
  unavailable: "The assistant is unavailable right now. Please check your date or call instead.",
  network: "I couldn't reach the assistant. Check your connection and try again, or call instead.",
};

type Opts = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  online?: boolean;
  /** Called only when the AI is actually asked (for the "thinking" state). */
  onRemote?: () => void;
};

export async function ask(raw: string, opts: Opts = {}): Promise<AskResult> {
  const message = raw.trim();
  if (!message) return fail("empty", FAILURE_COPY.empty, false);
  if (message.length > MAX_INPUT_CHARS) return fail("too_long", FAILURE_COPY.tooLong, false);

  // Business facts are answered from facts.ts, never by the AI.
  const local = localAnswer(message);
  if (local) return { ok: true, answer: local };

  const online = opts.online ?? (typeof navigator === "undefined" ? true : navigator.onLine);
  if (!online) return fail("offline", FAILURE_COPY.offline, true);

  opts.onRemote?.();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? CLIENT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await (opts.fetchImpl ?? fetch)("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timer);
    if (ctrl.signal.aborted) return fail("timeout", FAILURE_COPY.timeout, true);
    return fail("network", FAILURE_COPY.network, true);
  }
  clearTimeout(timer);

  const data = (await res.json().catch(() => null)) as { reply?: unknown } | null;
  if (res.status === 429) {
    const n = Number(res.headers.get("retry-after"));
    return fail("rate_limited", FAILURE_COPY.rateLimited, false, Number.isFinite(n) && n > 0 ? n : undefined);
  }
  if (res.status === 504) return fail("timeout", FAILURE_COPY.timeout, true);
  if (!res.ok || typeof data?.reply !== "string" || !data.reply.trim()) return fail("unavailable", FAILURE_COPY.unavailable, true);

  // Defence in depth: the server already guards replies.
  const g = guardReply(data.reply);
  const wantsBooking = g.replaced || intents(message).includes("book");
  return {
    ok: true,
    answer: {
      text: g.text,
      source: g.replaced ? "guard" : "upstream",
      ...(wantsBooking ? { action: { kind: "book" as const, selection: extractSelection(message) } } : {}),
    },
  };
}
