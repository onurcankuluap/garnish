"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FormData = {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  details: string;
  plan: string;
  honeypot: string;
};

const initialForm: FormData = {
  name: "",
  phone: "",
  email: "",
  eventType: "",
  eventDate: "",
  guestCount: "",
  details: "",
  plan: "",
  honeypot: "",
};

const eventTypes = [
  "Wedding",
  "Private Party",
  "Corporate Event",
  "Birthday",
  "Dinner Party",
  "Other",
];

// text-base (16px) on mobile prevents iOS auto-zoom; sm:text-sm on larger screens
const field =
  "w-full bg-transparent border-b border-white/12 text-foreground font-inter text-base sm:text-sm py-3 outline-none focus:border-gold transition-colors duration-200 placeholder:text-[var(--muted)]";

const label =
  "block font-inter text-[9px] tracking-[0.28em] uppercase text-[var(--muted)] mb-2";

export default function ContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateRef = useRef<HTMLInputElement>(null);
  const [form,        setForm]        = useState<FormData>({
    ...initialForm,
    plan: searchParams.get("plan") ?? "",
  });
  const [status,      setStatus]      = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [successName, setSuccessName] = useState("");
  const [countdown,   setCountdown]   = useState(5);

  useEffect(() => {
    if (status !== "success") return;
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(interval); router.push("/"); }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, router]);

  const set = (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res  = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessName(form.name.split(" ")[0]);
        setStatus("success");
      } else {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  /* ── Success state ── */
  if (status === "success") {
    return (
      <div className="flex flex-col items-start justify-center h-full py-10">
        <div className="w-12 h-px bg-gold mb-10" />
        <h2 className="font-cormorant text-4xl md:text-5xl font-semibold text-foreground leading-tight mb-5">
          Thank you{successName ? `, ${successName}` : ""}.
        </h2>
        <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] mb-10">
          I&apos;ll be in touch shortly to discuss your event.
        </p>
        <div className="flex items-center gap-4">
          <svg className="text-gold" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1"/>
            <circle
              cx="14" cy="14" r="13"
              stroke="#c9a84c"
              strokeWidth="1.5"
              strokeDasharray={`${(2 * Math.PI * 13 * countdown) / 5} ${2 * Math.PI * 13}`}
              strokeDashoffset={2 * Math.PI * 13 * 0.25}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s linear", transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            <text x="14" y="18" textAnchor="middle" fill="#c9a84c" fontSize="10" fontFamily="system-ui">{countdown}</text>
          </svg>
          <span className="font-inter text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
            Returning to home…
          </span>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* Honeypot — hidden from real users */}
      <div className="hidden" aria-hidden="true">
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.honeypot}
          onChange={set("honeypot")}
        />
      </div>

      {/* Selected plan */}
      <div>
        <label className={label}>Selected Plan</label>
        {form.plan ? (
          <div className="flex items-center gap-3 py-3 border-b border-white/12">
            <span className="font-inter text-base sm:text-sm text-gold font-semibold">{form.plan}</span>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, plan: "" }))}
              className="font-inter text-[10px] text-[var(--muted)] hover:text-foreground transition-colors underline"
            >
              change
            </button>
          </div>
        ) : (
          <select
            className={`${field} cursor-pointer`}
            value={form.plan}
            onChange={set("plan")}
          >
            <option value="">No specific plan — just inquiring</option>
            <option value="Basic" className="bg-[#0a0a0a]">Basic — Starting at $75/hr</option>
            <option value="Standard" className="bg-[#0a0a0a]">Standard — Starting at $110/hr</option>
            <option value="Bartender+DJ" className="bg-[#0a0a0a]">Bartender + DJ — Starting at $160/hr</option>
          </select>
        )}
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <label className={label}>
            Full Name <span className="text-gold">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Jane Smith"
            className={field}
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
          />
        </div>
        <div>
          <label className={label}>
            Phone <span className="text-gold">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+1 (555) 000-0000"
            className={field}
            value={form.phone}
            onChange={set("phone")}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className={label}>
          Email <span className="text-[var(--muted)] normal-case tracking-normal">— optional</span>
        </label>
        <input
          type="email"
          placeholder="jane@example.com"
          className={field}
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
        />
      </div>

      {/* Event type + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <label className={label}>
            Type of Event <span className="text-gold">*</span>
          </label>
          <select
            required
            className={`${field} cursor-pointer`}
            value={form.eventType}
            onChange={set("eventType")}
          >
            <option value="" disabled>Select…</option>
            {eventTypes.map((t) => (
              <option key={t} value={t} className="bg-[#0a0a0a]">{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>
            Event Date <span className="text-gold">*</span>
          </label>
          <div className="relative">
            <input
              ref={dateRef}
              type="date"
              required
              className={`${field} cursor-pointer pr-8`}
              value={form.eventDate}
              onChange={set("eventDate")}
              min={new Date().toISOString().split("T")[0]}
              onClick={() => {
                // showPicker() only on desktop — mobile opens natively on tap
                if (window.matchMedia("(pointer: fine)").matches) {
                  dateRef.current?.showPicker?.();
                }
              }}
            />
            <svg
              className="absolute right-0 bottom-3 pointer-events-none text-[var(--muted)]"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Guest count */}
      <div>
        <label className={label}>
          Estimated Guests <span className="text-gold">*</span>
        </label>
        <input
          type="number"
          required
          min="1"
          inputMode="numeric"
          placeholder="e.g. 60"
          className={field}
          value={form.guestCount}
          onChange={set("guestCount")}
        />
      </div>

      {/* Details */}
      <div>
        <label className={label}>
          Additional Details <span className="text-[var(--muted)] normal-case tracking-normal">— optional</span>
        </label>
        <textarea
          rows={4}
          placeholder="Venue, theme, preferred drinks, special requests…"
          className={`${field} resize-none`}
          value={form.details}
          onChange={set("details")}
        />
      </div>

      {/* Error */}
      {status === "error" && (
        <p className="font-inter text-xs text-red-400/90 border-l-2 border-red-400/50 pl-4 py-1">
          {errorMsg}
        </p>
      )}

      {/* Submit — min-h-[48px] ensures adequate touch target on mobile */}
      <div className="pt-2 pb-24 sm:pb-2">
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-10 min-h-[48px] bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] active:bg-[#b8923e] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          {status === "loading" ? "Sending…" : "Send Inquiry"}
          {status !== "loading" && (
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          )}
        </button>
      </div>
    </form>
  );
}
