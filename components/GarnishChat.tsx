"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { OPEN_CHAT_EVENT } from "@/components/site/MobileBar";

type Message = {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";

const GREETING: Message = {
  role: "assistant",
  content: "Hi, I'm Garnish's AI concierge. Ask me about packages, events or how booking works.",
};

/**
 * The AI concierge. Clearly labelled as automated; it never claims to be a
 * person or shows a fake presence status. Non-modal dialog: Esc closes it and
 * focus returns to the launcher.
 */
export default function GarnishChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // the phones' bar ("Ask") and any other entry point open it with an event
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, open);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, open);
  }, []);

  useEffect(() => {
    if (isOpen) track("chat_open");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json().catch(() => null)) as { reply?: unknown; error?: unknown } | null;

      if (!response.ok || typeof data?.reply !== "string") {
        const error =
          response.status === 429 && typeof data?.error === "string"
            ? data.error
            : "The AI concierge is unavailable right now. Please send an inquiry or call instead.";
        setMessages((current) => [...current, { role: "assistant", content: error, error: true }]);
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: data.reply as string }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "We couldn't reach the AI concierge. Please check your connection, or send an inquiry.", error: true },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close the AI concierge" : "Open the AI concierge"}
        aria-expanded={isOpen}
        aria-controls="garnish-concierge"
        className="chat-launcher fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-[#111111] text-gold shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition-colors hover:border-gold hover:bg-[#171717]"
      >
        {isOpen ? (
          <span className="text-xl" aria-hidden="true">
            ×
          </span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 5.75C5 4.78 5.78 4 6.75 4h10.5C18.22 4 19 4.78 19 5.75v7.5c0 .97-.78 1.75-1.75 1.75H11l-4.5 4v-4H6.75C5.78 15 5 14.22 5 13.25v-7.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          id="garnish-concierge"
          role="dialog"
          aria-modal="false"
          aria-labelledby="concierge-title"
          aria-describedby="concierge-disclosure"
          className="fixed bottom-24 right-6 z-50 flex h-[min(540px,calc(100dvh-8rem))] w-[calc(100vw-3rem)] max-w-[380px] flex-col overflow-hidden border border-white/10 bg-[#101010] shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        >
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-inter text-[11px] uppercase tracking-[0.25em] text-gold">Garnish</p>
                <h2 id="concierge-title" className="mt-1 font-cormorant text-2xl font-semibold text-foreground">
                  AI Concierge
                </h2>
              </div>
              <span className="mt-1 border border-gold/50 px-2 py-0.5 font-inter text-[11px] uppercase tracking-[0.15em] text-gold">
                AI
              </span>
            </div>
            <p id="concierge-disclosure" className="mt-2 font-inter text-xs leading-relaxed text-[var(--muted-light)]">
              An automated assistant, not a person. It can make mistakes, so confirm details when you book.
            </p>
          </div>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
          >
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div key={`${message.role}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] bg-gold px-4 py-3 font-inter text-sm leading-relaxed text-[#0a0a0a]"
                        : `max-w-[85%] border px-4 py-3 font-inter text-sm leading-relaxed whitespace-pre-wrap ${
                            message.error ? "border-red-400/50 text-red-300" : "border-white/10 bg-[#171717] text-[var(--muted-light)]"
                          }`
                    }
                  >
                    <span className="sr-only">{isUser ? "You: " : "AI concierge: "}</span>
                    {message.content}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="border border-white/10 bg-[#171717] px-4 py-3 font-inter text-sm text-[var(--muted-light)]">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
            <label htmlFor="concierge-input" className="sr-only">
              Your question for the AI concierge
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="concierge-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask about Garnish…"
                rows={1}
                maxLength={3000}
                aria-busy={isLoading}
                className="min-h-[48px] flex-1 resize-none border border-white/20 bg-[#151515] px-4 py-3 font-inter text-base sm:text-sm text-foreground placeholder:text-[var(--muted)] focus:border-gold/60"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-gold text-[#0a0a0a] transition-colors hover:bg-[#d4b05f] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 font-inter text-xs">
              <Link href="/book" data-track="chat_to_booking" className="inline-flex min-h-[32px] items-center text-gold hover:text-[#d4b05f]">
                Check your date →
              </Link>
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex min-h-[32px] items-center text-[var(--muted-light)] hover:text-gold">
                  Call instead
                </a>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
