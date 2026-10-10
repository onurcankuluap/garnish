"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

type FormData = {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  details: string;
  plan: string;
  website: string; // honeypot
};

type Field = Exclude<keyof FormData, "website">;
type FieldErrors = Partial<Record<Field, string>>;

const initialForm: FormData = {
  name: "",
  phone: "",
  email: "",
  eventType: "",
  eventDate: "",
  guestCount: "",
  details: "",
  plan: "",
  website: "",
};

const eventTypes = ["Wedding", "Private Party", "Corporate Event", "Birthday", "Dinner Party", "Other"];

const plans = [
  { value: "Basic", label: "Basic — Starting at $75/hr" },
  { value: "Standard", label: "Standard — Starting at $110/hr" },
  { value: "Bartender + DJ", label: "Bartender + DJ — Starting at $160/hr" },
];

/** Maps ?plan= spellings to a published package; anything else is ignored. */
function planFromParam(raw: string | null): string {
  const v = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (v === "basic") return "Basic";
  if (v === "standard") return "Standard";
  if (v === "bartender+dj" || v === "bartender dj" || v === "bartender + dj") return "Bartender + DJ";
  return "";
}

/** Today in New York (the business timezone) as YYYY-MM-DD. */
function todayInNewYork(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function newKey(): string {
  const c: Crypto = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  // RFC 4122 v4 fallback for older browsers (and non-secure contexts).
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const noopSubscribe = () => () => {};

const ORDER: Field[] = ["plan", "name", "phone", "email", "eventType", "eventDate", "guestCount", "details"];

function validate(form: FormData, minDate: string): FieldErrors {
  const e: FieldErrors = {};
  if (!form.name.trim()) e.name = "Please enter your name.";
  const digits = form.phone.replace(/\D/g, "");
  if (!form.phone.trim()) e.phone = "Please enter a phone number.";
  else if (!/^[+()\-.\s\d]+$/.test(form.phone.trim()) || digits.length < 7 || digits.length > 15)
    e.phone = "Please enter a valid phone number.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    e.email = "Please enter a valid email address.";
  if (!form.eventType) e.eventType = "Please choose the type of event.";
  if (!form.eventDate) e.eventDate = "Please choose a date.";
  else if (minDate && form.eventDate < minDate) e.eventDate = "Please choose a date from today onward.";
  if (!/^\d+$/.test(form.guestCount.trim()) || Number(form.guestCount) < 1)
    e.guestCount = "Please enter the number of guests.";
  return e;
}

// text-base (16px) on mobile prevents iOS auto-zoom; sm:text-sm on larger screens.
// The underline is white/40 (about 3.8:1 against the page) for non-text contrast.
const fieldBase =
  "w-full bg-transparent border-b text-foreground font-inter text-base sm:text-sm py-3 transition-colors duration-200 placeholder:text-[var(--muted)] focus:border-gold";
const field = (invalid: boolean) => `${fieldBase} ${invalid ? "border-red-400" : "border-white/40"}`;

const label = "block font-inter text-[11px] tracking-[0.22em] uppercase text-[var(--muted-light)] mb-2";

type Saved = { name: string; ref: string; message: string; notified: boolean; mock: boolean };

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormData>(() => ({
    ...initialForm,
    plan: planFromParam(searchParams.get("plan")),
  }));
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState<Saved | null>(null);
  // Client-only: New York's today. The server snapshot is "" because the page
  // is static; computing it during render would freeze the build date.
  const minDate = useSyncExternalStore(noopSubscribe, todayInNewYork, () => "");

  const idemKey = useRef<string>("");
  const startedAt = useRef<number>(0);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // One idempotency key and start time per form session (client only).
  useEffect(() => {
    idemKey.current = newKey();
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (saved) successRef.current?.focus();
  }, [saved]);

  const set =
    (f: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [f]: value }));
      if (f !== "website" && errors[f]) setErrors((prev) => ({ ...prev, [f]: undefined }));
    };

  const focusFirstError = (errs: FieldErrors) => {
    const first = ORDER.find((f) => errs[f]);
    if (first) document.getElementById(first)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const clientErrors = validate(form, minDate);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setErrorMsg("Please check the highlighted fields.");
      setStatus("error");
      focusFirstError(clientErrors);
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    setErrors({});

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey.current },
        body: JSON.stringify({ ...form, startedAt: startedAt.current }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;

      if (res.ok && data?.ok === true) {
        setSaved({
          name: form.name.trim().split(" ")[0],
          ref: typeof data.ref === "string" ? data.ref : "",
          message: typeof data.message === "string" ? data.message : "Your inquiry is saved.",
          notified: data.notification === "sent",
          mock: data.mode === "mock",
        });
        return;
      }

      const serverErrors = (data?.fields ?? {}) as FieldErrors;
      setErrors(serverErrors);
      setErrorMsg(
        typeof data?.error === "string"
          ? data.error
          : "Something went wrong and nothing was sent. Please try again, or call instead."
      );
      setStatus("error");
      if (Object.keys(serverErrors).length) focusFirstError(serverErrors);
      else alertRef.current?.focus();
    } catch {
      setErrorMsg(
        "We couldn't reach the server, so nothing was sent. Please check your connection and try again, or call instead."
      );
      setStatus("error");
      alertRef.current?.focus();
    }
  };

  /* ── Saved state (no auto-redirect) ── */
  if (saved) {
    return (
      <div className="flex flex-col items-start justify-center h-full py-10">
        <div className="w-12 h-px bg-gold mb-10" aria-hidden="true" />
        {saved.mock && (
          <p className="mb-6 border border-gold/50 px-3 py-2 font-inter text-xs text-gold">
            Test mode: nothing was emailed and nothing was stored permanently.
          </p>
        )}
        <h2
          ref={successRef}
          tabIndex={-1}
          className="font-cormorant text-4xl md:text-5xl font-semibold text-foreground leading-tight mb-5 outline-none"
        >
          {saved.notified ? "Thank you" : "Request received"}
          {saved.name ? `, ${saved.name}` : ""}.
        </h2>
        <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] mb-4 max-w-md" role="status">
          {saved.message}
        </p>
        {saved.ref && (
          <p className="font-inter text-xs text-[var(--muted-light)] mb-10">
            Reference: <span className="text-foreground tracking-[0.1em]">{saved.ref}</span>
          </p>
        )}
        <Link
          href="/"
          className="inline-flex items-center gap-3 min-h-[44px] font-inter text-xs tracking-[0.2em] uppercase text-gold hover:text-[#d4b05f] transition-colors"
        >
          Back to home <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  const a11y = (f: Field) => ({
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errors[f] ? `${f}-error` : undefined,
  });

  const errorText = (f: Field) =>
    errors[f] ? (
      <p id={`${f}-error`} className="mt-2 font-inter text-xs text-red-400">
        {errors[f]}
      </p>
    ) : null;

  /* ── Form ── */
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7" aria-describedby="form-note">
      <p id="form-note" className="font-inter text-xs text-[var(--muted-light)]">
        Fields marked <span aria-hidden="true" className="text-gold">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      {/* Honeypot: hidden from people and assistive tech; bots fill it */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={set("website")}
        />
      </div>

      {/* Package */}
      <div>
        <label htmlFor="plan" className={label}>
          Package <span className="normal-case tracking-normal">— optional</span>
        </label>
        <select
          id="plan"
          className={`${field(Boolean(errors.plan))} cursor-pointer`}
          value={form.plan}
          onChange={set("plan")}
          {...a11y("plan")}
        >
          <option value="" className="bg-[#0a0a0a]">
            No specific package — just inquiring
          </option>
          {plans.map((p) => (
            <option key={p.value} value={p.value} className="bg-[#0a0a0a]">
              {p.label}
            </option>
          ))}
        </select>
        {errorText("plan")}
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <label htmlFor="name" className={label}>
            Full Name <span className="text-gold" aria-hidden="true">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={100}
            placeholder="Jane Smith"
            className={field(Boolean(errors.name))}
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
            {...a11y("name")}
          />
          {errorText("name")}
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            Phone <span className="text-gold" aria-hidden="true">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            required
            maxLength={30}
            placeholder="+1 (555) 000-0000"
            className={field(Boolean(errors.phone))}
            value={form.phone}
            onChange={set("phone")}
            autoComplete="tel"
            {...a11y("phone")}
          />
          {errorText("phone")}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={label}>
          Email <span className="normal-case tracking-normal">— optional</span>
        </label>
        <input
          id="email"
          type="email"
          maxLength={254}
          placeholder="jane@example.com"
          className={field(Boolean(errors.email))}
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
          {...a11y("email")}
        />
        {errorText("email")}
      </div>

      {/* Event type + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <div>
          <label htmlFor="eventType" className={label}>
            Type of Event <span className="text-gold" aria-hidden="true">*</span>
          </label>
          <select
            id="eventType"
            required
            className={`${field(Boolean(errors.eventType))} cursor-pointer`}
            value={form.eventType}
            onChange={set("eventType")}
            {...a11y("eventType")}
          >
            <option value="" disabled className="bg-[#0a0a0a]">
              Select…
            </option>
            {eventTypes.map((t) => (
              <option key={t} value={t} className="bg-[#0a0a0a]">
                {t}
              </option>
            ))}
          </select>
          {errorText("eventType")}
        </div>
        <div>
          <label htmlFor="eventDate" className={label}>
            Event Date <span className="text-gold" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <input
              id="eventDate"
              ref={dateRef}
              type="date"
              required
              className={`${field(Boolean(errors.eventDate))} cursor-pointer pr-8`}
              value={form.eventDate}
              onChange={set("eventDate")}
              min={minDate || undefined}
              {...a11y("eventDate")}
              onClick={() => {
                // showPicker() only on desktop; mobile opens natively on tap
                if (window.matchMedia("(pointer: fine)").matches) {
                  try {
                    dateRef.current?.showPicker?.();
                  } catch {
                    /* not allowed in some browsers; the native control still works */
                  }
                }
              }}
            />
            <svg
              className="absolute right-0 bottom-3 pointer-events-none text-[var(--muted-light)]"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          {errorText("eventDate")}
        </div>
      </div>

      {/* Guest count */}
      <div>
        <label htmlFor="guestCount" className={label}>
          Estimated Guests <span className="text-gold" aria-hidden="true">*</span>
        </label>
        <input
          id="guestCount"
          type="number"
          required
          min="1"
          max="2000"
          inputMode="numeric"
          placeholder="e.g. 60"
          className={field(Boolean(errors.guestCount))}
          value={form.guestCount}
          onChange={set("guestCount")}
          {...a11y("guestCount")}
        />
        {errorText("guestCount")}
      </div>

      {/* Details */}
      <div>
        <label htmlFor="details" className={label}>
          Additional Details <span className="normal-case tracking-normal">— optional</span>
        </label>
        <textarea
          id="details"
          rows={4}
          maxLength={2000}
          placeholder="Venue, theme, preferred drinks, special requests…"
          className={`${field(Boolean(errors.details))} resize-none`}
          value={form.details}
          onChange={set("details")}
          {...a11y("details")}
        />
        {errorText("details")}
      </div>

      {/* Error summary: announced and focusable */}
      <div ref={alertRef} tabIndex={-1} role="alert" className="outline-none">
        {status === "error" && errorMsg && (
          <p className="font-inter text-sm text-red-400 border-l-2 border-red-400/70 pl-4 py-1">{errorMsg}</p>
        )}
      </div>

      {/* Submit */}
      <div className="pt-2 pb-24 sm:pb-2">
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-10 min-h-[48px] bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] active:bg-[#b8923e] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          {status === "loading" ? "Saving…" : "Send Inquiry"}
          {status !== "loading" && (
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          )}
        </button>
        <p className="sr-only" aria-live="polite">
          {status === "loading" ? "Saving your inquiry…" : ""}
        </p>
      </div>
    </form>
  );
}
