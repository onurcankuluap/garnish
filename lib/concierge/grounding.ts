import { business, claims, eventTypes, pricingTerms, tiers, type EventKey, type Fact } from "@/lib/content/facts";
import type { Selection } from "@/lib/compose/quote";
import { fromParams } from "@/lib/compose/selection";

/**
 * Grounding for the AI concierge. Pure, shared by the client wrapper
 * (lib/concierge/client.ts) and the /api/chat handler.
 *
 * 1. `localAnswer`: questions about business facts are answered here, from
 *    lib/content/facts.ts only, without calling the AI. Verified facts are
 *    stated; unverified or missing ones are never stated: the answer says
 *    Onur will confirm.
 * 2. `guardReply`: an AI reply that asserts something facts.ts does not
 *    verify (prices, places served, years, venues, promises, licensing) is
 *    replaced with a safe answer. The AI's knowledge lives outside this repo
 *    (facts register F63), so its replies are checked, not trusted.
 * 3. Booking intent gets a "Check your date" action that pre-fills /book
 *    through lib/compose/selection.
 */

export type Intent =
  | "book"
  | "price"
  | "terms"
  | "area"
  | "alcohol"
  | "packages"
  | "events"
  | "contact"
  | "about"
  | "identity"
  | "greeting";

export type BookAction = { kind: "book"; selection: Selection };

export type Answer = {
  text: string;
  action?: BookAction;
  /** facts = answered locally; upstream = the AI's reply; guard = an AI reply replaced. */
  source: "facts" | "upstream" | "guard";
};

const owner = business.ownerFirstName.value;
const phone = business.phone.value.display;
const base = business.baseTown.value.label;

/* ── intent ───────────────────────────────────────────────────────── */

const PATTERNS: [Intent, RegExp][] = [
  ["identity", /\b(are you (a |an )?(human|real|person|bot|robot|ai|onur)|who am i (talking|speaking) to|is this (a )?(bot|human|onur))\b/i],
  ["alcohol", /\b(alcohol|liquor|booze|spirits|beer|wine|byob|licen[cs]ed?|licen[cs]ing|insur(ed|ance)|permits?|tips cert|servsafe)\b/i],
  ["terms", /\b(deposits?|cancel(l?ation|l?ing)?|refunds?|minimum|min\.? hours|pay(ment)?|contract)\b/i],
  ["price", /(\$|\b(price|prices|pricing|cost|costs|how much|rates?|quote|fees?|charge|budget|expensive|cheap|afford)\b)/i],
  ["area", /\b(travel|serve|service area|come to|philadelphia|philly|washington|d\.?c\.?|baltimore|maryland|new jersey|lewes|dewey|bethany|ocean city|milton|milford|dover|wilmington|where are you|based|miles|how far|distance)\b/i],
  ["book", /\b(book|booking|reserve|reservation|availab(le|ility)|free on|open on|check (my|the|our|a) date|hire|hiring|schedule)\b/i],
  ["packages", /\b(packages?|tiers?|basic|standard|dj|menu|cocktails?|includes?|inclusions?|what do you offer|services?)\b/i],
  ["events", /\b(weddings?|birthdays?|corporate|dinner part(y|ies)|private part(y|ies)|(kinds?|types?|sorts?) of (events|parties|occasions)|what events)\b/i],
  ["contact", /\b(phone|call|number|e-?mail|contact|reach (you|onur))\b/i],
  ["about", /\b(who (is|are|runs)|owner|onur|experience|years|background|worked|bartender(s)? (is|are))\b/i],
  ["greeting", /^\s*(hi|hello|hey|good (morning|afternoon|evening)|yo)\b[\s!.,]*$/i],
];

/** Every intent the message matches, in priority order. */
export function intents(message: string): Intent[] {
  return PATTERNS.filter(([, re]) => re.test(message)).map(([i]) => i);
}

/* ── booking handoff ──────────────────────────────────────────────── */

const EVENT_WORDS: [EventKey, RegExp][] = [
  ["wedding", /\b(wedding|rehearsal dinner|engagement)\b/i],
  ["birthday", /\bbirthday\b/i],
  ["corporate", /\b(corporate|company|office|work|team) (event|party|do|offsite)|\bcorporate\b/i],
  ["dinner-party", /\bdinner part(y|ies)\b/i],
  ["private-party", /\b(private part(y|ies)|house party|backyard party|party)\b/i],
];

/** Pulls the card's fields out of a message; validated by selection.fromParams. */
export function extractSelection(message: string): Selection {
  const p: Record<string, string> = {};
  const ev = EVENT_WORDS.find(([, re]) => re.test(message));
  if (ev && eventTypes.value.some((e) => e.key === ev[0])) p.event = ev[0];
  const g = /\b(\d{1,4})\s*(guests|people|persons|pax|attendees|adults)\b/i.exec(message);
  if (g) p.guests = g[1];
  const h = /\b(\d{1,2}(?:\.5)?)\s*(hours|hour|hrs|hr)\b/i.exec(message);
  if (h) p.hours = h[1];
  if (/\bbartender\s*(\+|and|&|plus)\s*dj\b|\bdj (package|tier)\b/i.test(message)) p.tier = "dj";
  else if (/\bstandard\b/i.test(message)) p.tier = "standard";
  else if (/\bbasic\b/i.test(message)) p.tier = "basic";
  if (p.tier !== "dj" && /\b(a |with )?dj\b/i.test(message)) p.extras = "dj";
  if (/\bcustom cocktails?\b/i.test(message)) p.extras = [p.extras, "custom-cocktails"].filter(Boolean).join(",");
  return fromParams(p);
}

/** Turn count bucket for chat_to_booking (closed set, see ANALYTICS-PLAN). */
export function turnBand(userTurns: number): "1" | "2-3" | "4+" {
  return userTurns <= 1 ? "1" : userTurns <= 3 ? "2-3" : "4+";
}

/* ── local, facts-only answers ────────────────────────────────────── */

const say = <T,>(f: Fact<T>, text: string) => (f.verified ? text : null);

const CONFIRM = `${owner} confirms that with you directly`;

function eventList() {
  return eventTypes.value
    .filter((e) => e.key !== "other")
    .map((e) => e.label.toLowerCase())
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1");
}

const ANSWERS: Partial<Record<Intent, (message: string) => string>> = {
  identity: () => `I'm Garnish's AI assistant, not ${owner}. I answer from the site's own facts, and ${owner} confirms every detail when you book.`,
  greeting: () => `Hello. I'm Garnish's AI assistant. Ask me about the events ${owner} bartends, how booking works, or the bar options.`,
  price: () =>
    tiers.some((t) => t.rate.verified)
      ? `Published starting rates: ${tiers.filter((t) => t.rate.verified).map((t) => `${t.name} from $${t.rate.value} per hour`).join("; ")}. ${owner} confirms the final quote.`
      : `Rates are being confirmed, so I can't quote a price here. Every evening gets a personal quote: check your date with your guests and hours, and ${owner} sends one.`,
  terms: () => `Deposits, minimum hours, payment and cancellation terms aren't published yet, so I won't guess. ${CONFIRM} when you check your date.`,
  alcohol: () =>
    say(claims.alcoholAndLicensing, String(claims.alcoholAndLicensing.value)) ??
    `Who supplies the alcohol, and licensing and insurance for your venue, aren't published yet. ${CONFIRM}, before anything is booked.`,
  area: () =>
    `Garnish is based in ${base}. ${
      say(claims.serviceArea, `It serves ${claims.serviceArea.value}.`) ?? `Whether ${owner} can travel to your venue, and any travel terms, is something ${owner} confirms with you.`
    } Tell us the town when you check your date.`,
  packages: () =>
    `There are three bars: ${tiers.map((t) => t.name).join(", ")}. ${
      tiers.every((t) => t.inclusions.every((i) => i.verified)) ? "" : `Exactly what each includes is being confirmed, so ${owner} walks you through it with your quote. `
    }You can compose yours on the home page, or choose it when you check your date.`,
  events: () => `${owner} bartends ${eventList()}, and other gatherings too. Check your date to tell us about yours.`,
  contact: () => `You can call ${owner} on ${phone}, or check your date online and ${owner} gets back to you.`,
  about: () =>
    `Garnish is ${business.owner.value}'s private bartending service, based in ${base}. ${
      say(claims.experience, `${claims.experience.value}.`) ?? `${owner} is happy to talk you through the background when you speak.`
    }`,
  book: () => `I can't see the calendar, so I can't promise a date. Check your date in a few short steps (no payment, no account), and ${owner} confirms availability with you.`,
};

/** Priority for the answer text when several intents match. */
const ORDER: Intent[] = ["identity", "alcohol", "terms", "price", "area", "book", "packages", "events", "contact", "about", "greeting"];

/** Intents that invite the "Check your date" action. */
const HANDOFF = new Set<Intent>(["book", "price", "area", "terms", "events", "packages"]);

/**
 * A facts-only answer, or null when the message is not about business facts
 * (then the AI answers, and its reply goes through guardReply).
 */
export function localAnswer(message: string): Answer | null {
  const found = intents(message);
  const primary = ORDER.find((i) => found.includes(i));
  if (!primary) return null;
  const text = ANSWERS[primary]?.(message);
  if (!text) return null;
  const handoff = found.some((i) => HANDOFF.has(i));
  return { text, source: "facts", ...(handoff ? { action: { kind: "book", selection: extractSelection(message) } } : {}) };
}

/* ── reply guard ──────────────────────────────────────────────────── */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Phrases that would assert something facts.ts does not verify. */
export function unverifiedPatterns(): RegExp[] {
  const out: RegExp[] = [
    // money and rates (no price is verified)
    /\$\s?\d|\b\d+\s?(dollars|usd|bucks)\b|\bper (hour|guest|person|head)\b|\/\s?(hr|hour)\b|\bhourly (rate|fee|charge)\b/i,
    // years of experience, promises, badges
    /\b\d+\+?\s*(years?|yrs)\b/i,
    /\b(within )?24 hours\b|\bahead of schedule\b|\bweeks before\b|\bmost popular\b|\bnow booking\b/i,
    // licensing, insurance, certification, terms
    /\b(licensed|insured|certified|tips[- ]certified|servsafe|liability insurance)\b/i,
    /\b(deposit|non-?refundable|cancellation (fee|policy)|minimum of \d)\b/i,
  ];
  if (!claims.serviceArea.verified) out.push(/\b(philadelphia|philly|washington|d\.c\.|\bdc\b|baltimore|new jersey|maryland|new york city|nyc)\b/i);
  if (!claims.pastVenues.verified) {
    const words = claims.pastVenues.value.map((v) => escapeRe(v.split(/\s+/)[0]));
    out.push(new RegExp(`\\b(${words.join("|")})\\b`, "i"));
  }
  for (const t of tiers) if (!t.rate.verified) out.push(new RegExp(`\\b${t.rate.value}\\b`));
  if (!pricingTerms.over50Threshold.verified) out.push(/\bover 50 guests\b/i);
  return out;
}

const PATTERNS_CACHE = unverifiedPatterns();

export const SAFE_REPLY = `I can't confirm that here, so I won't guess. ${owner} confirms details like this with you directly: check your date, or call ${phone}.`;

/** A reply that asserts an unverified claim is replaced; anything else passes as is. */
export function guardReply(reply: string): { text: string; replaced: boolean } {
  const hit = PATTERNS_CACHE.some((re) => re.test(reply));
  return hit ? { text: SAFE_REPLY, replaced: true } : { text: reply, replaced: false };
}
