/**
 * Analytics hook points. `track()` is a no-op by default: no provider, no
 * network, no cookies. A provider can be attached later with
 * `setAnalyticsSink()` from one client module, after a consent decision.
 *
 * Hook points (where `track` is already called):
 * - hero_cta        Check your date in the hero, header and booking band (data-track)
 * - call_click      any tel: link (data-track="call_click")
 * - package_select  a tier chosen in Compose your bar
 * - compose_to_book Compose your bar → /book with the card
 * - booking_start   /book mounted (booking flow, Phase 7)
 * - booking_complete / booking_error  the booking flow's result (Phase 7)
 * - chat_open       the AI concierge opened
 * - chat_to_booking the concierge's link into booking (Phase 8)
 *
 * Never pass personal data: names, emails, phone numbers, free text or dates
 * are stripped by `sanitize` as a backstop.
 */
export type AnalyticsEvent =
  | "hero_cta"
  | "call_click"
  | "package_select"
  | "compose_to_book"
  | "booking_start"
  | "booking_complete"
  | "booking_error"
  | "chat_open"
  | "chat_to_booking";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;
export type AnalyticsSink = (event: AnalyticsEvent, props: AnalyticsProps) => void;

let sink: AnalyticsSink | null = null;

export function setAnalyticsSink(next: AnalyticsSink | null) {
  sink = next;
}

const BLOCKED = /name|email|mail|phone|tel|address|message|details|note|date|ip/i;

export function sanitize(props: AnalyticsProps = {}): AnalyticsProps {
  const out: AnalyticsProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || BLOCKED.test(k)) continue;
    if (typeof v === "string" && (v.length > 64 || /@|\d{6,}/.test(v))) continue;
    out[k] = v;
  }
  return out;
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps) {
  if (!sink) return;
  try {
    sink(event, sanitize(props));
  } catch {
    // analytics must never break the page
  }
}
