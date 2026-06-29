"use client";

import { useState } from "react";

type FormData = {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  details: string;
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

const field =
  "w-full bg-transparent border-b border-white/12 text-foreground font-inter text-sm py-3 outline-none focus:border-gold transition-colors duration-200 placeholder:text-[var(--muted)]";

const label =
  "block font-inter text-[9px] tracking-[0.28em] uppercase text-[var(--muted)] mb-2";

export default function ContactForm() {
  const [form,        setForm]        = useState<FormData>(initialForm);
  const [status,      setStatus]      = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [successName, setSuccessName] = useState("");

  const set = (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8]">
          I&apos;ll be in touch shortly to discuss your event.
        </p>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <form onSubmit={handleSubmit} className="space-y-8">

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

      {/* Name + Phone */}
      <div className="grid sm:grid-cols-2 gap-8">
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
        />
      </div>

      {/* Event type + Date */}
      <div className="grid sm:grid-cols-2 gap-8">
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
          <input
            type="date"
            required
            className={`${field} cursor-pointer`}
            value={form.eventDate}
            onChange={set("eventDate")}
          />
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

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={status === "loading"}
          className="group inline-flex items-center gap-3 px-10 py-3.5 bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
