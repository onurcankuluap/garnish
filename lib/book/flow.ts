import { eventTypes, extras as EXTRAS, tiers, type EventKey, type ExtraKey, type TierKey } from "@/lib/content/facts";
import { EMPTY, LIMITS, type Selection } from "@/lib/compose/quote";
import { MAX_HORIZON_DAYS, addDays, isCalendarDate } from "@/lib/contact/dates";
import { HOURS_RANGE, MAX_GUESTS, MAX_LOCATION_CHARS, type ContactMethod } from "@/lib/contact/limits";

/**
 * The booking flow's model: steps, the draft, client-side checks that mirror
 * the server schema (lib/contact/schema.ts, which stays authoritative), and
 * the mapping to the /api/contact payload. Pure, so it is unit tested.
 *
 * Personal fields (name, phone, email, place, notes, date) live only in
 * component state and the request body: never in the URL, storage or
 * analytics. Only the card (occasion, guests, hours, bar, extras) is saved,
 * through lib/compose/selection.
 */

export const STEPS = [
  { key: "date", title: "The date", short: "Date" },
  { key: "place", title: "The place", short: "Place" },
  { key: "bar", title: "Your bar", short: "Bar" },
  { key: "you", title: "How to reach you", short: "You" },
  { key: "review", title: "Review and send", short: "Review" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export type Draft = {
  eventDate: string;
  eventTime: string;
  location: string;
  event: EventKey | "";
  guests: string;
  hours: string;
  /** "" = not sure yet (Onur suggests one). */
  tier: TierKey | "";
  extras: ExtraKey[];
  name: string;
  phone: string;
  email: string;
  contactMethod: ContactMethod;
  details: string;
  /** Honeypot: hidden from people, only bots fill it. */
  website: string;
};

export type DraftField = Exclude<keyof Draft, "website">;
export type DraftErrors = Partial<Record<DraftField, string>>;

export const EMPTY_DRAFT: Draft = {
  eventDate: "",
  eventTime: "",
  location: "",
  event: "",
  guests: "",
  hours: "",
  tier: "",
  extras: [],
  name: "",
  phone: "",
  email: "",
  contactMethod: "phone",
  details: "",
  website: "",
};

export const FIELDS_BY_STEP: Record<StepKey, DraftField[]> = {
  date: ["eventDate", "eventTime"],
  place: ["location"],
  bar: ["event", "guests", "hours", "tier", "extras"],
  you: ["name", "phone", "email", "contactMethod", "details"],
  review: [],
};

export const MAX_DETAILS_CHARS = 2000;
export const HOUR_OPTIONS: number[] = Array.from(
  { length: (HOURS_RANGE.max - HOURS_RANGE.min) * 2 + 1 },
  (_, i) => HOURS_RANGE.min + i / 2,
);

export function stepIndex(key: StepKey) {
  return STEPS.findIndex((s) => s.key === key);
}

export function stepOf(field: DraftField): StepKey {
  return (Object.keys(FIELDS_BY_STEP) as StepKey[]).find((k) => FIELDS_BY_STEP[k].includes(field)) ?? "review";
}

/** The card carried from Compose your bar fills the bar step. */
export function fromSelection(sel: Selection, base: Draft = EMPTY_DRAFT): Draft {
  return {
    ...base,
    event: sel.event ?? base.event,
    guests: sel.guests ? String(sel.guests) : base.guests,
    hours: sel.hours ? String(sel.hours) : base.hours,
    tier: sel.tier ?? base.tier,
    extras: sel.extras.length ? [...sel.extras] : base.extras,
  };
}

/** The non-personal part of the draft, saved back as the session's card. */
export function toSelection(d: Draft): Selection {
  const g = Number(d.guests);
  const h = Number(d.hours);
  return {
    ...EMPTY,
    event: d.event || null,
    guests: /^\d+$/.test(d.guests.trim()) && g >= LIMITS.guests.min && g <= LIMITS.guests.max ? g : null,
    hours: d.hours && Number.isFinite(h) && h >= LIMITS.hours.min && h <= LIMITS.hours.max ? h : null,
    tier: d.tier || null,
    extras: [...d.extras],
  };
}

const PHONE_CHARS = /^[+()\-.\s\d]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Checks one step. `today` is New York's date (YYYY-MM-DD); "" skips the range check (before hydration). */
export function validateStep(step: StepKey, d: Draft, today: string): DraftErrors {
  const e: DraftErrors = {};
  if (step === "date" || step === "review") {
    if (!d.eventDate) e.eventDate = "Please choose a date.";
    else if (!isCalendarDate(d.eventDate)) e.eventDate = "Please choose a valid date.";
    else if (today && d.eventDate < today) e.eventDate = "Please choose a date from today onward.";
    else if (today && d.eventDate > addDays(today, MAX_HORIZON_DAYS)) e.eventDate = "That date is too far ahead. Please call to discuss.";
    if (d.eventTime && !TIME.test(d.eventTime)) e.eventTime = "Please choose a valid time, or leave it blank.";
  }
  if (step === "place" || step === "review") {
    const loc = d.location.trim();
    if (!loc) e.location = "Please tell us the town or venue.";
    else if (loc.length > MAX_LOCATION_CHARS) e.location = `Keep this under ${MAX_LOCATION_CHARS} characters.`;
  }
  if (step === "bar" || step === "review") {
    if (!d.event) e.event = "Please choose the occasion.";
    const g = d.guests.trim();
    if (!/^\d{1,5}$/.test(g) || Number(g) < 1) e.guests = "Please enter the number of guests.";
    else if (Number(g) > MAX_GUESTS) e.guests = `For more than ${MAX_GUESTS} guests, please call.`;
    if (d.hours && !HOUR_OPTIONS.includes(Number(d.hours))) e.hours = `Choose between ${HOURS_RANGE.min} and ${HOURS_RANGE.max} hours.`;
  }
  if (step === "you" || step === "review") {
    if (!d.name.trim()) e.name = "Please enter your name.";
    else if (d.name.trim().length > 100) e.name = "Keep this under 100 characters.";
    const digits = d.phone.replace(/\D/g, "");
    if (!d.phone.trim()) e.phone = "Please enter a phone number.";
    else if (!PHONE_CHARS.test(d.phone.trim()) || digits.length < 7 || digits.length > 15) e.phone = "Please enter a valid phone number.";
    const email = d.email.trim();
    if (email && !EMAIL.test(email)) e.email = "Please enter a valid email address.";
    else if (!email && d.contactMethod === "email") e.email = "Add an email address, or choose another way to reach you.";
    if (d.details.length > MAX_DETAILS_CHARS) e.details = `Keep this under ${MAX_DETAILS_CHARS} characters.`;
  }
  return e;
}

/** The body for POST /api/contact (the durable lead system). */
export function toPayload(d: Draft, startedAt: number) {
  return {
    name: d.name,
    phone: d.phone,
    email: d.email,
    eventType: eventTypes.value.find((e) => e.key === d.event)?.formValue ?? "",
    eventDate: d.eventDate,
    eventTime: d.eventTime,
    location: d.location,
    guestCount: d.guests.trim(),
    hours: d.hours ? Number(d.hours) : null,
    plan: tiers.find((t) => t.key === d.tier)?.formValue ?? "",
    extras: d.extras,
    contactMethod: d.contactMethod,
    details: d.details,
    source: "book" as const,
    website: d.website,
    startedAt,
  };
}

/** Server field names (lib/contact/schema.ts) → draft fields. */
const SERVER_FIELD: Record<string, DraftField> = {
  name: "name",
  phone: "phone",
  email: "email",
  eventType: "event",
  eventDate: "eventDate",
  eventTime: "eventTime",
  location: "location",
  guestCount: "guests",
  hours: "hours",
  plan: "tier",
  extras: "extras",
  contactMethod: "contactMethod",
  details: "details",
};

export function fromServerFields(fields: Record<string, unknown> | null | undefined): DraftErrors {
  const out: DraftErrors = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    const f = SERVER_FIELD[k];
    if (f && typeof v === "string" && !out[f]) out[f] = v;
  }
  return out;
}

/** The first step holding an error, in flow order. */
export function firstErrorStep(errors: DraftErrors): StepKey | null {
  for (const s of STEPS) if (FIELDS_BY_STEP[s.key].some((f) => errors[f])) return s.key;
  return null;
}

/** What a failed submit means to the visitor. */
export type SubmitFailure =
  | { kind: "validation"; message: string; errors: DraftErrors }
  | { kind: "rate_limited"; message: string; retryAfter: number | null }
  | { kind: "store"; message: string }
  | { kind: "too_fast"; message: string }
  | { kind: "stale"; message: string }
  | { kind: "offline"; message: string }
  | { kind: "network"; message: string }
  | { kind: "other"; message: string };

export type SubmitSuccess = { ok: true; ref: string; notified: boolean; duplicate: boolean; mock: boolean };

/** Analytics code for booking_error (closed enum, see docs/build/ANALYTICS-PLAN.md). */
export function errorCode(f: SubmitFailure): "store" | "validation" | "rate_limited" | "network" | "other" {
  if (f.kind === "validation" || f.kind === "store" || f.kind === "rate_limited") return f.kind;
  if (f.kind === "network" || f.kind === "offline") return "network";
  return "other";
}

export const MESSAGES = {
  network: "We couldn't reach the server, so nothing was sent. Your answers are still here: check your connection and try again, or call instead.",
  offline: "You appear to be offline, so nothing was sent. Your answers are still here: send again once you're back online, or call instead.",
  other: "Something went wrong and nothing was sent. Your answers are still here: please try again, or call instead.",
  invalid: "Please check the highlighted answers.",
};

/** Interprets the /api/contact response (status + parsed JSON body). */
export function interpret(status: number, data: Record<string, unknown> | null, retryAfterHeader: string | null): SubmitSuccess | SubmitFailure {
  if (status >= 200 && status < 300 && data?.ok === true) {
    return {
      ok: true,
      ref: typeof data.ref === "string" ? data.ref : "",
      notified: data.notification === "sent",
      duplicate: data.duplicate === true,
      mock: data.mode === "mock",
    };
  }
  const message = typeof data?.error === "string" ? data.error : MESSAGES.other;
  const code = typeof data?.code === "string" ? data.code : "";
  if (status === 422) return { kind: "validation", message: MESSAGES.invalid, errors: fromServerFields(data?.fields as Record<string, unknown>) };
  if (status === 429) {
    const n = Number(retryAfterHeader);
    return { kind: "rate_limited", message, retryAfter: Number.isFinite(n) && n > 0 ? n : null };
  }
  if (status === 503) return { kind: "store", message };
  if (code === "too_fast") return { kind: "too_fast", message };
  if (code === "stale_form" || code === "missing_idempotency_key") return { kind: "stale", message };
  return { kind: "other", message };
}

export function extraLabel(k: ExtraKey) {
  return EXTRAS.find((x) => x.key === k)?.label ?? k;
}

/** A fresh UUID v4 (the idempotency key for one booking). */
export function newKey(c: Crypto = globalThis.crypto): string {
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
