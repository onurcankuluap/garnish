"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type Message = {
  from: "bot" | "user";
  text: string;
  link?: { label: string; href: string };
};

const quickReplies = [
  "What's your experience?",
  "What events do you cover?",
  "Where are you based?",
  "How do I book?",
];

function match(input: string): Message {
  const q = input.toLowerCase();

  if (/experi|background|work|train|venue|bardea|stingray|drift|bodhi|year/.test(q))
    return {
      from: "bot",
      text: "Eight years behind professional bars — Bardea Food & Drink, Stingray Sushi Bar & Asian Grill, Bodhi Kitchen, and Drift Seafood & Raw Bar. I bring that same restaurant-level precision to every private event.",
    };

  if (/event|cover|wedding|party|corporate|dinner|birthday|type/.test(q))
    return {
      from: "bot",
      text: "I work weddings, private dinner parties, corporate events, birthdays, and anything in between. Every menu is composed around your event specifically — nothing generic.",
    };

  if (/where|locat|base|area|travel|rehoboth|delaware|dc|philadelphia/.test(q))
    return {
      from: "bot",
      text: "Based in Rehoboth Beach, DE. I serve the Delaware beaches, Philadelphia, DC, and surrounding areas. Reach out and we can discuss travel for your event.",
    };

  if (/book|inquir|contact|reserv|avail|start|hire|price|cost|rate|how much/.test(q))
    return {
      from: "bot",
      text: "Fill out a quick inquiry form and I'll be in touch personally within 24 hours to discuss your event, menu, and pricing.",
      link: { label: "Submit an Inquiry →", href: "/contact" },
    };

  if (/menu|cocktail|drink|seasonal|craft|ingredient|custom/.test(q))
    return {
      from: "bot",
      text: "Every menu is written weeks before your event. Seasonal ingredients, deliberately chosen spirits, and each cocktail built around the rhythm of the evening — not just a list of drinks.",
    };

  if (/hello|hi|hey|sup|who are you/.test(q))
    return {
      from: "bot",
      text: "Hey — I'm Onur. Private bartender, eight years in, obsessed with the craft. Ask me anything about Garnish or how I can make your event unforgettable.",
    };

  return {
    from: "bot",
    text: "Good question — let's talk it through properly. Send me an inquiry and I'll get back to you within 24 hours.",
    link: { label: "Submit an Inquiry →", href: "/contact" },
  };
}

function CoupeAvatar() {
  return (
    <div className="w-7 h-7 rounded-full border border-gold/40 bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
      <svg width="11" height="14" viewBox="0 0 32 42" fill="none" aria-hidden="true">
        <path d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z" stroke="#c9a84c" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(201,168,76,0.08)"/>
        <line x1="16" y1="28" x2="16" y2="36" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="9" y1="36" x2="23" y2="36" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="27" cy="6.5" r="3.8" stroke="#c9a84c" strokeWidth="1.2" fill="none"/>
        <line x1="27" y1="2.7" x2="27" y2="10.3" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
        <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
        <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

const greeting: Message = {
  from: "bot",
  text: "Hey — I'm Onur, your private bartender. Classic technique, seasonal instinct, zero shortcuts. What would you like to know?",
};

export default function BartenderWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [bubble, setBubble] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const show = setTimeout(() => setBubble(true), 2000);
    const hide = setTimeout(() => setBubble(false), 7000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320);
  }, [open]);

  function send(text: string) {
    if (!text.trim() || typing) return;
    setMessages((prev) => [...prev, { from: "user", text: text.trim() }]);
    setInput("");
    setTyping(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, match(text)]);
    }, 900 + Math.random() * 400);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") send(input);
  }

  // Hide on contact page — widget would cover the submit button on mobile
  if (pathname === "/contact") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Chat window ── */}
      <div
        className={`transition-all duration-300 origin-bottom-right ${
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-3 pointer-events-none"
        }`}
      >
        <div className="w-80 bg-[#0f0f0f] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 440 }}>

          {/* Header */}
          <div className="bg-[#141414] border-b border-white/6 px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
            <CoupeAvatar />
            <div className="flex-1 min-w-0">
              <p className="font-cormorant text-sm font-semibold text-foreground leading-none mb-0.5">
                Onur Kulualp
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold/70 animate-pulse flex-shrink-0" />
                <span className="font-inter text-[8.5px] tracking-[0.12em] uppercase text-[var(--muted)]">
                  Private Bartender · Rehoboth Beach, DE
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-foreground transition-colors text-lg leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none"
            style={{ scrollbarWidth: "none" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
                {m.from === "bot" && <CoupeAvatar />}
                <div className={`flex flex-col gap-1.5 max-w-[78%] ${m.from === "user" ? "items-end" : ""}`}>
                  <div
                    className={`px-3.5 py-2.5 text-xs leading-[1.75] font-inter ${
                      m.from === "bot"
                        ? "bg-[#1a1a1a] border border-white/6 text-[var(--muted-light)]"
                        : "bg-gold text-[#0a0a0a] font-medium"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.link && (
                    <Link
                      href={m.link.href}
                      onClick={() => setOpen(false)}
                      className="font-inter text-[9px] tracking-[0.15em] uppercase text-gold hover:text-[#d4b05f] transition-colors duration-200 underline underline-offset-2"
                    >
                      {m.link.label}
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2.5">
                <CoupeAvatar />
                <div className="bg-[#1a1a1a] border border-white/6 px-4 py-3 flex items-center gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1 h-1 rounded-full bg-gold/50"
                      style={{ animation: `bounce 1s ${delay}ms infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — always visible, disabled while bot is typing */}
          <div className={`px-4 pb-3 flex flex-wrap gap-2 flex-shrink-0 transition-opacity duration-200 ${typing ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={typing}
                className="font-inter text-[8.5px] tracking-[0.1em] border border-white/10 text-[var(--muted)] px-3 py-1.5 hover:border-gold/40 hover:text-gold transition-all duration-200 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Call strip */}
          <div className="border-t border-white/6 px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-[#0a0a0a]">
            <span className="font-inter text-[8.5px] tracking-[0.15em] uppercase text-[var(--muted)]">
              Prefer to call?
            </span>
            <a
              href={`tel:${process.env.NEXT_PUBLIC_PHONE_NUMBER ?? ""}`}
              className="inline-flex items-center gap-2 font-inter text-[8.5px] tracking-[0.15em] uppercase text-gold hover:text-[#d4b05f] transition-colors duration-200"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call Now
            </a>
          </div>

          {/* Input */}
          <div className="border-t border-white/6 flex items-center gap-2 px-4 py-3 flex-shrink-0 bg-[#0f0f0f]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={typing}
              placeholder={typing ? "Onur is typing…" : "Ask me anything…"}
              className="flex-1 bg-transparent font-inter text-xs text-foreground placeholder:text-[var(--muted)] outline-none disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              aria-label="Send"
              className="text-gold disabled:opacity-20 hover:text-[#d4b05f] transition-colors duration-200 flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Speech bubble ── */}
      <div
        className={`flex items-center gap-3 transition-all duration-500 ${
          bubble && !open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-1 pointer-events-none"
        }`}
      >
        <div className="relative bg-[#141414] border border-white/10 px-4 py-2.5 shadow-xl">
          <p className="font-cormorant text-sm text-foreground leading-none whitespace-nowrap">
            Planning an event?{" "}
            <em className="not-italic text-gold">Let&rsquo;s talk.</em>
          </p>
          {/* Tail pointing right toward the button */}
          <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderLeft: "6px solid rgba(255,255,255,0.10)",
            }}
          />
        </div>
        <button
          onClick={() => setBubble(false)}
          className="text-[var(--muted)] hover:text-foreground transition-colors text-base leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* ── Trigger button ── */}
      <button
        onClick={() => { setOpen(!open); setBubble(false); }}
        aria-label={open ? "Close chat" : "Chat with Onur"}
        className={`relative w-14 h-14 rounded-full border transition-all duration-300 flex items-center justify-center shadow-2xl ${
          open
            ? "bg-[#141414] border-gold/60"
            : "bg-[#0f0f0f] border-gold/30 hover:border-gold/60 hover:scale-105"
        }`}
      >
        {!open && (
          <span className="absolute inset-0 rounded-full border border-gold/20 animate-ping" />
        )}
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="26" viewBox="0 0 32 42" fill="none" aria-hidden="true">
            <path d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z" stroke="#c9a84c" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(201,168,76,0.08)"/>
            <line x1="16" y1="28" x2="16" y2="36" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="36" x2="23" y2="36" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="27" cy="6.5" r="3.8" stroke="#c9a84c" strokeWidth="1" fill="none"/>
            <line x1="27" y1="2.7" x2="27" y2="10.3" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
