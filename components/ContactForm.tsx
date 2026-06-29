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
  honeypot: string; // bot trap — never shown to users
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

const inputClass =
  "w-full bg-[#0a0a0a] border border-white/15 text-foreground font-inter text-sm px-4 py-3 outline-none focus:border-gold transition-colors placeholder:text-muted";

const labelClass = "block font-inter text-xs tracking-wider uppercase text-muted mb-2";

export default function ContactForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successName, setSuccessName] = useState("");

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
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

  if (status === "success") {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-px bg-gold mx-auto mb-8" />
        <h2 className="font-cormorant text-3xl font-semibold text-foreground mb-4">
          Thanks{successName ? `, ${successName}` : ""}
        </h2>
        <p className="font-inter text-muted text-sm leading-relaxed">
          I&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot — hidden from real users, filled by bots */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.honeypot}
          onChange={set("honeypot")}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className={labelClass}>
            Full Name <span className="text-gold">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="Jane Smith"
            className={inputClass}
            value={form.name}
            onChange={set("name")}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone Number <span className="text-gold">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            required
            placeholder="+1 (555) 000-0000"
            className={inputClass}
            value={form.phone}
            onChange={set("phone")}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email Address <span className="text-muted normal-case">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="jane@example.com"
          className={inputClass}
          value={form.email}
          onChange={set("email")}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="eventType" className={labelClass}>
            Type of Event <span className="text-gold">*</span>
          </label>
          <select
            id="eventType"
            required
            className={`${inputClass} cursor-pointer`}
            value={form.eventType}
            onChange={set("eventType")}
          >
            <option value="" disabled>
              Select event type
            </option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="eventDate" className={labelClass}>
            Event Date <span className="text-gold">*</span>
          </label>
          <input
            id="eventDate"
            type="date"
            required
            className={`${inputClass} cursor-pointer`}
            value={form.eventDate}
            onChange={set("eventDate")}
          />
        </div>
      </div>

      <div>
        <label htmlFor="guestCount" className={labelClass}>
          Estimated Number of Guests <span className="text-gold">*</span>
        </label>
        <input
          id="guestCount"
          type="number"
          required
          min="1"
          placeholder="e.g. 50"
          className={inputClass}
          value={form.guestCount}
          onChange={set("guestCount")}
        />
      </div>

      <div>
        <label htmlFor="details" className={labelClass}>
          Additional Details or Requests{" "}
          <span className="text-muted normal-case">(optional)</span>
        </label>
        <textarea
          id="details"
          rows={5}
          placeholder="Tell me about your event, theme, preferred drinks, or any special requests..."
          className={`${inputClass} resize-none`}
          value={form.details}
          onChange={set("details")}
        />
      </div>

      {status === "error" && (
        <p className="font-inter text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full sm:w-auto px-10 py-3.5 bg-gold text-[#0a0a0a] font-inter font-semibold text-sm tracking-widest uppercase hover:bg-[#d4b05f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Sending…" : "Send Inquiry"}
      </button>
    </form>
  );
}
