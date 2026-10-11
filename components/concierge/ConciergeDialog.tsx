"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { business, phone } from "@/lib/content/facts";
import { bookHref, save } from "@/lib/compose/selection";
import type { ChatSurface, OpenChatDetail } from "@/lib/concierge/events";
import { MAX_INPUT_CHARS, ask, type AskFailure } from "@/lib/concierge/client";
import { turnBand, type Answer } from "@/lib/concierge/grounding";
import { track } from "@/lib/analytics";

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; answer: Answer }
  | { id: number; role: "error"; failure: AskFailure; question: string };

const owner = business.ownerFirstName.value;

const visible = (el: Element | null | undefined): el is HTMLElement =>
  !!el && el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

/** What the host (./Concierge) can do once this chunk has loaded. */
export interface ConciergeApi {
  show: (detail?: OpenChatDetail) => void;
}

export interface ConciergeDialogProps {
  /** The dialog's id (the launcher's aria-controls). */
  id: string;
  /** Called once after mount with the dialog's API, so a queued open can run. */
  onReady: (api: ConciergeApi) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * The AI concierge dialog, loaded lazily by ./Concierge (the host keeps the
 * launcher and the `garnish:open-chat` listener in the initial bundle and
 * queues an open that arrives before this chunk). A modal <dialog> (focus
 * trap, Esc and an inert page come with it). Focus returns to whatever opened
 * it; if that is gone or hidden (a phone's hidden launcher), to the bar's Ask
 * button, the launcher or the page.
 *
 * Answers about the business come from facts.ts (lib/concierge/grounding);
 * other questions go to /api/chat unchanged, whose replies are guarded. No
 * fake typing and no presence status: replies appear when they arrive.
 */
export default function ConciergeDialog({ id, onReady, onOpenChange }: ConciergeDialogProps) {
  const uid = id;
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const busy = useRef(false);

  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [inputError, setInputError] = useState("");

  const userTurns = msgs.filter((m) => m.role === "user").length;

  const show = useCallback((detail: OpenChatDetail = {}) => {
    const d = dialog.current;
    if (!d || d.open) return;
    const active = document.activeElement;
    opener.current = detail.opener ?? (active instanceof HTMLElement && active !== document.body ? active : null);
    d.showModal();
    document.documentElement.classList.add("chat-open");
    onOpenChange(true);
    track("chat_open", { surface: (detail.surface ?? "other") satisfies ChatSurface });
    // phones: don't throw the keyboard up over the conversation on open
    if (matchMedia("(pointer: coarse)").matches) heading.current?.focus();
    else input.current?.focus();
  }, [onOpenChange]);

  const close = useCallback(() => dialog.current?.close(), []);

  // hand the host its API once the dialog is in the DOM (it may hold a queued open)
  useEffect(() => {
    onReady({ show });
  }, [onReady, show]);

  // Fires for the close button, Esc and the backdrop alike.
  function onClose() {
    document.documentElement.classList.remove("chat-open");
    onOpenChange(false);
    const fallback = [opener.current, document.querySelector(".mbar .ask"), document.querySelector(".cc-launch"), document.getElementById("main")].find(visible);
    fallback?.focus();
  }

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, thinking]);

  async function send(question: string) {
    if (busy.current) return;
    const q = question.trim();
    if (!q) return setInputError("Type a question first.");
    if (q.length > MAX_INPUT_CHARS) return setInputError(`Please keep questions under ${MAX_INPUT_CHARS} characters.`);
    busy.current = true;
    setInputError("");
    setMsgs((m) => [...m, { id: ++seq.current, role: "user", text: q }]);
    setText("");
    const r = await ask(q, { onRemote: () => setThinking(true) });
    setThinking(false);
    setMsgs((m) => [
      ...m,
      r.ok ? { id: ++seq.current, role: "assistant", answer: r.answer } : { id: ++seq.current, role: "error", failure: r, question: q },
    ]);
    busy.current = false;
  }

  function retry(id: number, question: string) {
    // drop the failed exchange; send() adds the question again
    setMsgs((m) => m.filter((x) => x.id !== id && x.id !== id - 1));
    void send(question);
  }

  function toBooking(answer: Answer) {
    if (!answer.action) return;
    save(answer.action.selection);
    track("chat_to_booking", { turn_band: turnBand(userTurns) });
    opener.current = null; // the page is changing; focus goes to the new page
    close();
    router.push(bookHref(answer.action.selection));
  }

  const counterVisible = text.length > MAX_INPUT_CHARS * 0.8;

  return (
    <>

      <dialog
        ref={dialog}
        id={uid}
        className="cc"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-disc`}
        onClose={onClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // the backdrop
        }}
      >
        <div className="cc-in">
          <header className="cc-head">
            <div>
              <p className="cc-eyebrow">Garnish</p>
              <h2 id={`${uid}-title`} ref={heading} tabIndex={-1}>
                Concierge <span className="cc-badge">AI</span>
              </h2>
            </div>
            <button type="button" className="cc-close" onClick={close}>
              Close <span className="sr-only">the concierge</span>
              <i aria-hidden="true" />
            </button>
          </header>
          <p id={`${uid}-disc`} className="cc-disc">
            <b>AI assistant — {owner} confirms details.</b> It answers from this site&rsquo;s facts and can be wrong. Nothing here is a
            booking or a quote.
          </p>

          <div ref={log} className="cc-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
            {msgs.length === 0 && (
              <p className="cc-hello">Ask about the events {owner} bartends, the bar options, or how booking works.</p>
            )}
            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="cc-msg cc-user">
                  <span className="sr-only">You: </span>
                  {m.text}
                </div>
              ) : m.role === "assistant" ? (
                <div key={m.id} className="cc-msg cc-bot" data-source={m.answer.source}>
                  <span className="sr-only">AI assistant: </span>
                  {m.answer.text}
                  {m.answer.action && (
                    <span className="cc-act">
                      <a
                        className="btn btn-gold"
                        href={bookHref(m.answer.action.selection)}
                        onClick={(e) => {
                          e.preventDefault();
                          toBooking(m.answer);
                        }}
                      >
                        Check your date <span className="ar" aria-hidden="true" />
                      </a>
                    </span>
                  )}
                </div>
              ) : (
                <div key={m.id} className="cc-msg cc-err" data-kind={m.failure.kind}>
                  <span className="sr-only">Problem: </span>
                  {m.failure.message}
                  {m.failure.retryAfter ? ` (about ${Math.ceil(m.failure.retryAfter)} seconds)` : ""}
                  {m.failure.retry && (
                    <span className="cc-act">
                      <button type="button" className="cc-retry" onClick={() => retry(m.id, m.question)}>
                        Try again
                      </button>
                    </span>
                  )}
                </div>
              ),
            )}
          </div>
          <p className="cc-status" role="status">
            {thinking ? "The assistant is answering…" : ""}
          </p>

          <form
            className="cc-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <label htmlFor={`${uid}-q`} className="sr-only">
              Your question for the AI assistant
            </label>
            <textarea
              id={`${uid}-q`}
              ref={input}
              rows={1}
              value={text}
              maxLength={MAX_INPUT_CHARS}
              placeholder="Ask about Garnish…"
              aria-invalid={inputError ? true : undefined}
              aria-describedby={[inputError ? `${uid}-qerr` : "", counterVisible ? `${uid}-count` : ""].filter(Boolean).join(" ") || undefined}
              onChange={(e) => {
                setText(e.target.value);
                if (inputError) setInputError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button type="submit" className="cc-send" disabled={thinking}>
              <span aria-hidden="true">→</span>
              <span className="sr-only">Send</span>
            </button>
          </form>
          {(inputError || counterVisible) && (
            <p className="cc-meta">
              {inputError && (
                <span id={`${uid}-qerr`} className="cc-qerr">
                  {inputError}
                </span>
              )}
              {counterVisible && (
                <span id={`${uid}-count`} className="num">
                  {MAX_INPUT_CHARS - text.length} characters left
                </span>
              )}
            </p>
          )}
          <p className="cc-foot">
            <a
              href="/book"
              onClick={(e) => {
                e.preventDefault();
                track("chat_to_booking", { turn_band: turnBand(userTurns) });
                opener.current = null;
                close();
                router.push("/book");
              }}
            >
              Check your date
            </a>
            <a className="num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="chat">
              Call {phone.display}
            </a>
          </p>
        </div>
      </dialog>
    </>
  );
}
