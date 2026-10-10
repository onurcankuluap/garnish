/** Calendar helpers in the business timezone, America/New_York. */

export const BUSINESS_TZ = "America/New_York";

/** Furthest event date accepted, in days from today (about three years). */
export const MAX_HORIZON_DAYS = 3 * 365;

/** Today's date in New York as YYYY-MM-DD. */
export function todayInBusinessTz(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** True when `ymd` is a real calendar date in YYYY-MM-DD form. */
export function isCalendarDate(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** "June 14, 2027" for a YYYY-MM-DD date (no timezone shift). */
export function formatLongDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "7:30 pm" for "19:30" (a wall-clock time; no timezone shift). */
export function formatTime(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
}
