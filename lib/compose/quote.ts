import {
  eventTypes,
  extras as allExtras,
  pricingTerms,
  tiers as allTiers,
  type EventKey,
  type ExtraKey,
  type Fact,
  type Tier,
  type TierKey,
} from "@/lib/content/facts";

/** What the visitor composed. Every field is optional until chosen. */
export interface Selection {
  event: EventKey | null;
  guests: number | null;
  hours: number | null;
  tier: TierKey | null;
  extras: ExtraKey[];
}

export const EMPTY: Selection = { event: null, guests: null, hours: null, tier: null, extras: [] };

export const LIMITS = {
  guests: { min: 1, max: 2000, step: 5, start: 50 },
  hours: { min: 1, max: 12, step: 0.5, start: 4 },
} as const;

export interface PricingSource {
  tiers: Tier[];
  over50Threshold: Fact<number>;
  over50Surcharge: Fact<number | null>;
  minimumHours: Fact<number | null>;
  travelFee: Fact<number | null>;
  deposit: Fact<number | null>;
}

export const DEFAULT_PRICING: PricingSource = {
  tiers: allTiers,
  over50Threshold: pricingTerms.over50Threshold,
  over50Surcharge: pricingTerms.over50Surcharge,
  minimumHours: pricingTerms.minimumHours,
  travelFee: pricingTerms.travelFee,
  deposit: pricingTerms.deposit,
};

export interface Inclusion {
  text: string;
  verified: boolean;
}

/** The menu card's result: a request for a quote, or (once rates are confirmed) an estimate. */
export type Result =
  | {
      mode: "request";
      complete: boolean;
      tier: Tier | null;
      inclusions: Inclusion[];
      /** Why there is no number: shown to the visitor. */
      reason: string;
      openItems: string[];
    }
  | {
      mode: "estimate";
      complete: true;
      tier: Tier;
      inclusions: Inclusion[];
      label: "Estimate, not a quote";
      /** The confirmed published starting rate × hours. Whole dollars. */
      from: number;
      basis: string;
      /** What can change the final quote. */
      canChange: string[];
    };

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function clampGuests(n: number) {
  return Math.min(LIMITS.guests.max, Math.max(LIMITS.guests.min, Math.round(n)));
}
export function clampHours(n: number) {
  return Math.min(LIMITS.hours.max, Math.max(LIMITS.hours.min, Math.round(n * 2) / 2));
}

export function isComplete(s: Selection) {
  return Boolean(s.event && s.guests && s.hours && s.tier);
}

/**
 * Pure. Numbers appear only when the chosen tier's rate is `verified` in
 * facts.ts. Every price-affecting term that is not verified is listed as
 * something that can change the final quote, never folded into the number.
 */
export function compose(s: Selection, src: PricingSource = DEFAULT_PRICING): Result {
  const tier = src.tiers.find((t) => t.key === s.tier) ?? null;
  const inclusions: Inclusion[] = tier ? tier.inclusions.map((f) => ({ text: f.value, verified: f.verified })) : [];
  const complete = isComplete(s);

  if (!tier || !complete || !tier.rate.verified) {
    const openItems: string[] = [];
    if (!s.event) openItems.push("the occasion");
    if (!s.guests) openItems.push("the guest count");
    if (!s.hours) openItems.push("the hours of service");
    if (!s.tier) openItems.push("the bar");
    return {
      mode: "request",
      complete,
      tier,
      inclusions,
      openItems,
      reason: tier && !tier.rate.verified
        ? "Rates are being confirmed, so your card goes to Onur for a personal quote."
        : "Compose your card, then send it for a personal quote.",
    };
  }

  const hours = s.hours as number;
  const guests = s.guests as number;
  const from = tier.rate.value * hours;
  const canChange: string[] = [];

  const threshold = src.over50Threshold.verified ? src.over50Threshold.value : 50;
  if (guests > threshold) {
    canChange.push(
      src.over50Surcharge.verified && src.over50Surcharge.value !== null
        ? `Parties over ${threshold} guests add ${usd(src.over50Surcharge.value)} per hour (included below only once confirmed).`
        : `Parties over ${threshold} guests add an hourly rate that is not included here.`,
    );
  }
  canChange.push(
    src.minimumHours.verified && src.minimumHours.value !== null
      ? `A minimum of ${src.minimumHours.value} hours applies.`
      : "Minimum hours, if any.",
  );
  canChange.push(src.travelFee.verified ? "Travel outside the base town." : "Travel, depending on the venue.");
  canChange.push(src.deposit.verified ? "The deposit terms." : "Deposit and cancellation terms.");
  canChange.push("Alcohol is not included in this figure.");
  for (const x of s.extras) {
    const extra = allExtras.find((e) => e.key === x);
    if (extra) canChange.push(`${extra.label}: priced in your quote.`);
  }

  return {
    mode: "estimate",
    complete: true,
    tier,
    inclusions,
    label: "Estimate, not a quote",
    from,
    basis: `${hours} h × ${usd(tier.rate.value)} published starting rate`,
    canChange,
  };
}

/**
 * The starting-rate label for a tier ("from $110 / hr"), or null while the
 * rate is unverified. Null in every environment: no placeholder figure.
 */
export function tierRateLabel(t: Tier, sep = " / "): string | null {
  return t.rate.verified ? `from ${usd(t.rate.value)}${sep}hr` : null;
}

/** "Basic from $75/hr, Standard from $110/hr" for the verified rates only, or null if none is verified. */
export function verifiedRatesLine(list: Tier[] = allTiers): string | null {
  const parts = list.flatMap((t) => {
    const label = tierRateLabel(t, "/");
    return label ? [`${t.name} ${label}`] : [];
  });
  return parts.length ? parts.join(", ") : null;
}

/** True once every tier's rate is verified (then the page can stop saying rates are being confirmed). */
export function allRatesVerified(list: Tier[] = allTiers): boolean {
  return list.every((t) => t.rate.verified);
}

/** A package option label for the /contact form: the name, plus the starting rate once verified. */
export function planOptionLabel(t: Tier): string {
  return t.rate.verified ? `${t.name} — Starting at ${usd(t.rate.value)}/hr` : t.name;
}

export function eventLabel(key: EventKey | null) {
  return eventTypes.value.find((e) => e.key === key)?.label ?? null;
}

export { usd };
