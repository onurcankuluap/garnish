import { z } from "zod";
import { MAX_HORIZON_DAYS, addDays, isCalendarDate, todayInBusinessTz } from "./dates";

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

export const MAX_GUESTS = 2000;

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
    if (key && !fields[key]) fields[key] = issue.message;
  }
  return { ok: false, fields };
}
