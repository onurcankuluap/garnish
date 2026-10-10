import { eventTypes, extras, tiers, type EventKey, type ExtraKey, type TierKey } from "@/lib/content/facts";
import { EMPTY, LIMITS, clampGuests, clampHours, type Selection } from "./quote";

/**
 * The configurator → /book handoff. The card travels in the URL
 * (`/book?event=wedding&guests=60&hours=4&tier=standard&extras=dj`) and is
 * mirrored in sessionStorage so it survives a reload or a detour. Both
 * parsers validate against facts.ts and drop anything unknown.
 */
export const STORAGE_KEY = "garnish:compose:v1";

type ParamsLike = { get(name: string): string | null } | Record<string, string | string[] | undefined>;

function read(p: ParamsLike, k: string): string | null {
  if (typeof (p as { get?: unknown }).get === "function") return (p as { get(n: string): string | null }).get(k);
  const v = (p as Record<string, string | string[] | undefined>)[k];
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

const EVENT_KEYS = new Set<string>(eventTypes.value.map((e) => e.key));
const TIER_KEYS = new Set<string>(tiers.map((t) => t.key));
const EXTRA_KEYS = new Set<string>(extras.map((e) => e.key));

function num(raw: string | null, min: number, max: number): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function fromParams(p: ParamsLike): Selection {
  const event = read(p, "event");
  const tier = read(p, "tier");
  const g = num(read(p, "guests"), LIMITS.guests.min, LIMITS.guests.max);
  const h = num(read(p, "hours"), LIMITS.hours.min, LIMITS.hours.max);
  const ex = (read(p, "extras") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s, i, a) => EXTRA_KEYS.has(s) && a.indexOf(s) === i) as ExtraKey[];
  return {
    event: event && EVENT_KEYS.has(event) ? (event as EventKey) : null,
    guests: g === null ? null : clampGuests(g),
    hours: h === null ? null : clampHours(h),
    tier: tier && TIER_KEYS.has(tier) ? (tier as TierKey) : null,
    extras: ex,
  };
}

export function toParams(s: Selection): URLSearchParams {
  const p = new URLSearchParams();
  if (s.event) p.set("event", s.event);
  if (s.guests) p.set("guests", String(s.guests));
  if (s.hours) p.set("hours", String(s.hours));
  if (s.tier) p.set("tier", s.tier);
  if (s.extras.length) p.set("extras", s.extras.join(","));
  return p;
}

export function hasAny(s: Selection) {
  return Boolean(s.event || s.guests || s.hours || s.tier || s.extras.length);
}

export function bookHref(s: Selection) {
  const q = toParams(s).toString();
  return q ? `/book?${q}` : "/book";
}

/** sessionStorage can be missing, full or blocked (private mode): never throw. */
export function save(s: Selection, storage: Pick<Storage, "setItem"> | undefined = safeSession()) {
  try {
    storage?.setItem(STORAGE_KEY, toParams(s).toString());
    return true;
  } catch {
    return false;
  }
}

export function load(storage: Pick<Storage, "getItem"> | undefined = safeSession()): Selection {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? fromParams(new URLSearchParams(raw)) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function safeSession(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
