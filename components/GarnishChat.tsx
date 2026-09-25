"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function GarnishChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi — I’m the Garnish concierge. Ask me about private bartending services or booking.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: message,
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Chat request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data?.reply ||
            "I'm not sure about that. Please contact Garnish directly.",
        },
      ]);
    } catch (error) {
      console.error("Garnish chat error:", error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "The chat service is temporarily unavailable. Please try again shortly.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating chat button */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close Garnish concierge" : "Open Garnish concierge"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-[#111111] text-gold shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition hover:border-gold hover:bg-[#171717]"
      >
        {isOpen ? (
          <span className="text-xl">×</span>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 5.75C5 4.78 5.78 4 6.75 4h10.5C18.22 4 19 4.78 19 5.75v7.5c0 .97-.78 1.75-1.75 1.75H11l-4.5 4v-4H6.75C5.78 15 5 14.22 5 13.25v-7.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[calc(100vw-3rem)] max-w-[380px] flex-col overflow-hidden border border-white/10 bg-[#101010] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          {/* Header */}
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-inter text-[9px] uppercase tracking-[0.3em] text-gold">
              Garnish
            </p>

            <div className="mt-1 flex items-center justify-between gap-4">
              <h2 className="font-cormorant text-2xl font-semibold text-foreground">
                Concierge
              </h2>

              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="font-inter text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] bg-gold px-4 py-3 font-inter text-sm leading-relaxed text-[#0a0a0a]"
                        : "max-w-[85%] border border-white/10 bg-[#171717] px-4 py-3 font-inter text-sm leading-relaxed text-[var(--muted-light)]"
                    }
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="border border-white/10 bg-[#171717] px-4 py-3 font-inter text-sm text-[var(--muted)]">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-white/10 p-4"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask about Garnish..."
                rows={1}
                maxLength={3000}
                disabled={isLoading}
                className="min-h-[48px] flex-1 resize-none border border-white/10 bg-[#151515] px-4 py-3 font-inter text-sm text-foreground outline-none placeholder:text-[var(--muted)] focus:border-gold/60 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center bg-gold text-[#0a0a0a] transition hover:bg-[#d4b05f] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                →
              </button>
            </div>

            <p className="mt-3 font-inter text-[9px] leading-relaxed text-[var(--muted)]">
              AI concierge for Garnish service and booking questions.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
