import { z } from "zod";
import { MAX_HORIZON_DAYS, addDays, isCalendarDate, todayInBusinessTz } from "./dates";
import { extras as EXTRAS } from "@/lib/content/facts";
import { CONTACT_METHODS, HOURS_RANGE, MAX_GUESTS, MAX_LOCATION_CHARS, SOURCES, type ContactMethod } from "./limits";

export const EVENT_TYPES = [
  "Wedding",
  "Private Party",
  "Corporate Event",
  "Birthday",
  "Dinner Party",
  "Other",
] as const;

/** Published packages. URL and form spellings map to one canonical name. */
export const PLAN_NAMES = ["Basic", "Standard", "Bartender + DJ"] as const;
export type PlanName = (typeof PLAN_NAMES)[number];

export function normalisePlan(value: unknown): PlanName | "" | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (v === "") return "";
  if (v === "basic") return "Basic";
  if (v === "standard") return "Standard";
  if (v === "bartender+dj" || v === "bartender dj" || v === "bartender + dj") return "Bartender + DJ";
  return null;
}

export { MAX_GUESTS, HOURS_RANGE, CONTACT_METHODS, SOURCES, MAX_LOCATION_CHARS } from "./limits";
export type { ContactMethod } from "./limits";

const EXTRA_KEYS = new Set<string>(EXTRAS.map((e) => e.key));

// Control characters (except tab/newline handling below) never belong in a field.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

const singleLine = (max: number) =>
  z
    .string({ error: "Required." })
    .transform((s) => s.replace(CONTROL, "").replace(/[\r\n\t]+/g, " ").trim())
    .pipe(z.string().max(max, { error: `Keep this under ${max} characters.` }));

const multiLine = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL, "").replace(/\r\n?/g, "\n").trim())
    .pipe(z.string().max(max, { error: `Keep this under ${max} characters.` }));

/**
 * The inquiry schema. `now` is injected so date rules are testable; dates are
 * judged in America/New_York, the business timezone.
 */
export function inquirySchema(now: Date = new Date()) {
  const today = todayInBusinessTz(now);
  const latest = addDays(today, MAX_HORIZON_DAYS);

  return z.object({
    name: singleLine(100).pipe(z.string().min(1, { error: "Please enter your name." })),
    phone: singleLine(30).pipe(
      z
        .string()
        .min(1, { error: "Please enter a phone number." })
        .regex(/^[+()\-.\s\d]+$/, { error: "Use digits, spaces and + ( ) - only." })
        .refine((p) => p.replace(/\D/g, "").length >= 7 && p.replace(/\D/g, "").length <= 15, {
          error: "Please enter a valid phone number.",
        })
    ),
    email: z
      .union([z.undefined(), z.null(), z.string()])
      .transform((s) => (s ?? "").replace(CONTROL, "").trim())
      .pipe(z.union([z.literal(""), z.email({ error: "Please enter a valid email address." }).max(254)])),
    eventType: z.enum(EVENT_TYPES, { error: "Please choose the type of event." }),
    eventDate: z
      .string({ error: "Please choose a date." })
      .trim()
      .refine(isCalendarDate, { error: "Please choose a valid date." })
      .refine((d) => !isCalendarDate(d) || d >= today, { error: "Please choose a date from today onward." })
      .refine((d) => !isCalendarDate(d) || d <= latest, { error: "That date is too far ahead. Please call to discuss." }),
    guestCount: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "number" ? String(v) : v.trim()))
      .pipe(
        z
          .string()
          .regex(/^\d{1,5}$/, { error: "Please enter the number of guests." })
          .transform(Number)
          .pipe(
            z
              .number()
              .int()
              .min(1, { error: "At least one guest, please." })
              .max(MAX_GUESTS, { error: `For more than ${MAX_GUESTS} guests, please call.` })
          )
      ),
    details: z
      .union([z.undefined(), z.null(), z.string()])
      .transform((s) => s ?? "")
      .pipe(multiLine(2000)),
    plan: z.unknown().transform((v, ctx) => {
      const p = normalisePlan(v);
      if (p === null) {
        ctx.addIssue({ code: "custom", message: "Please choose one of the packages." });
        return z.NEVER;
      }
      return p;
    }),

    // ── Optional fields added for the booking flow (/book). Every one has a
    //    default, so the /contact form and older clients stay valid as is. ──

    /** Optional start time, "HH:MM" (24 h), in the business timezone. */
    eventTime: z
      .union([z.null(), z.string()])
      .optional()
      .transform((s) => (s ?? "").trim())
      .pipe(
        z.union([
          z.literal(""),
          z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Please choose a valid time, or leave it blank." }),
        ])
      ),
    /** Town or venue. Required when the booking flow sends it (see refine below). */
    location: z
      .union([z.null(), z.string()])
      .optional()
      .transform((s) => s ?? "")
      .pipe(singleLine(MAX_LOCATION_CHARS)),
    /** Hours of service, in half hours. null when not given. */
    hours: z
      .union([z.null(), z.string(), z.number()])
      .optional()
      .transform((v, ctx) => {
        if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) return null;
        const n = typeof v === "number" ? v : Number(v.trim());
        if (!Number.isFinite(n) || n < HOURS_RANGE.min || n > HOURS_RANGE.max || Math.round(n * 2) !== n * 2) {
          ctx.addIssue({ code: "custom", message: `Choose between ${HOURS_RANGE.min} and ${HOURS_RANGE.max} hours.` });
          return z.NEVER;
        }
        return n;
      }),
    /** Requests from the configurator card (facts.ts extras); unknown keys are dropped. */
    extras: z
      .union([z.null(), z.array(z.unknown()).max(10, { error: "Too many extras." })])
      .optional()
      .transform((a) =>
        (a ?? []).filter((x, i, all): x is string => typeof x === "string" && EXTRA_KEYS.has(x) && all.indexOf(x) === i)
      ),
    contactMethod: z
      .union([z.null(), z.literal(""), z.enum(CONTACT_METHODS, { error: "Please choose how to reach you." })])
      .optional()
      .transform((v) => (v ?? "") as ContactMethod | ""),
    source: z
      .union([z.null(), z.enum(SOURCES, { error: "Invalid request." })])
      .optional()
      .transform((v) => v ?? "contact"),
  })
  .superRefine((d, ctx) => {
    if (d.contactMethod === "email" && !d.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Add an email address, or choose another way to reach you." });
    }
    if (d.source === "book" && !d.location) {
      ctx.addIssue({ code: "custom", path: ["location"], message: "Please tell us the town or venue." });
    }
  });
}

export type InquiryData = z.output<ReturnType<typeof inquirySchema>>;

export type FieldErrors = Partial<Record<keyof InquiryData, string>>;

export function validateInquiry(
  input: unknown,
  now: Date = new Date()
): { ok: true; data: InquiryData } | { ok: false; fields: FieldErrors } {
  const parsed = inquirySchema(now).safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fields: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof InquiryData | undefined;
    if (key && !fields[key]) fields[key] = cleanMessage(key, issue.message);
  }
  return { ok: false, fields };
}

/**
 * Field messages for zod's built-in issues ("Invalid input: expected
 * nonoptional, received undefined" when a field is omitted, or a wrong JSON
 * type). Library wording never reaches the visitor.
 */
const FALLBACK: Partial<Record<keyof InquiryData, string>> = {
  name: "Please enter your name.",
  phone: "Please enter a phone number.",
  email: "Please enter a valid email address, or leave it blank.",
  eventType: "Please choose the type of event.",
  eventDate: "Please choose a date.",
  guestCount: "Please enter the number of guests.",
  details: "Please check the details.",
  plan: "Please choose one of the packages.",
  eventTime: "Please choose a valid time, or leave it blank.",
  location: "Please tell us the town or venue.",
  hours: `Choose between ${HOURS_RANGE.min} and ${HOURS_RANGE.max} hours.`,
  extras: "Please check the extras.",
  contactMethod: "Please choose how to reach you.",
};

function cleanMessage(key: keyof InquiryData, message: string): string {
  if (!/^Invalid input\b/i.test(message)) return message;
  return FALLBACK[key] ?? "Please check this field.";
}
