/**
 * The single source of business facts for the site.
 *
 * Every claim carries `{ value, verified, status, source }`.
 *
 * - `status` mirrors the facts register (docs/redesign-audit/facts.md) exactly:
 *   "published" = VERIFIED (published), "system" = VERIFIED (system),
 *   "unverified" = UNVERIFIED, "missing" = MISSING. `register` is its row.
 * - `verified` means "safe to state as fact on the page and in metadata".
 *   It is true only for identity and contact facts the live site publishes
 *   and that Stage 1 already kept in metadata (name, owner, phone, base town,
 *   event types). Prices, inclusions, promises and everything unverified or
 *   missing stay `false` until the owner confirms them: flip the flag here,
 *   and the page, metadata and the configurator follow.
 *
 * Unverified claims render as marked placeholders (see `components/ui/Claim`)
 * outside Vercel production, are omitted in production, and never reach
 * metadata or JSON-LD (see `lib/content/seo.ts`).
 *
 * Prices (`kind: "price"`: rates, surcharges, fees, deposit) are stricter:
 * an unverified figure is never shown in any environment, not even as a
 * "[to confirm]" placeholder. The page shows the request-for-quote state.
 */

export type FactStatus = "published" | "system" | "unverified" | "missing";

export interface Fact<T> {
  value: T;
  verified: boolean;
  status: FactStatus;
  /**
   * Row in docs/redesign-audit/facts.md (1–39). Rows 70 and up are build-only
   * questions, numbered as F70+ in docs/build/FACTS-REGISTER.md.
   */
  register: number;
  source: string;
  /**
   * "price" marks a money figure (a rate, surcharge, fee or deposit). Unlike
   * other claims, an unverified price never renders, not even as a dev
   * placeholder with "[to confirm]": the page shows the request-for-quote
   * state until the owner confirms the figure.
   */
  kind?: "price";
}

const fact = <T,>(value: T, verified: boolean, status: FactStatus, register: number, source: string): Fact<T> => ({
  value,
  verified,
  status,
  register,
  source,
});

const priceFact = <T,>(value: T, verified: boolean, status: FactStatus, register: number, source: string): Fact<T> => ({
  ...fact(value, verified, status, register, source),
  kind: "price",
});

/* ── identity and contact ─────────────────────────────────────────── */

export const business = {
  name: fact("Garnish", true, "published", 1, "components/GarnishLogo.tsx; live header"),
  owner: fact("Onur Kulualp", true, "published", 3, "app/layout.tsx; live JSON-LD founder"),
  /** First name used in copy ("Onur calls you back"). Same fact as `owner`. */
  ownerFirstName: fact("Onur", true, "published", 3, "app/layout.tsx"),
  phone: fact(
    { display: "+1 302-542-3147", short: "302-542-3147", tel: "+13025423147" },
    true,
    "published",
    4,
    "live HTML on / and /contact; JSON-LD telephone (env NEXT_PUBLIC_PHONE_NUMBER)",
  ),
  baseTown: fact(
    { locality: "Rehoboth Beach", region: "DE", country: "US", label: "Rehoboth Beach, DE" },
    true,
    "published",
    6,
    "JSON-LD addressLocality (app/layout.tsx)",
  ),
  email: fact<string | null>(null, false, "missing", 5, "none: no mailto anywhere"),
  streetAddress: fact<string | null>(null, false, "missing", 6, "none"),
  socials: fact<string[]>([], false, "missing", 7, "none"),
  legalEntity: fact<string | null>(null, false, "missing", 2, "none"),
} as const;

/* ── services, areas and experience ──────────────────────────────── */

export type EventKey = "wedding" | "private-party" | "corporate" | "birthday" | "dinner-party" | "other";

export interface EventType {
  key: EventKey;
  label: string;
  /** The value the contact API's schema expects (lib/contact/schema.ts). */
  formValue: string;
}

export const eventTypes = fact<EventType[]>(
  [
    { key: "wedding", label: "Weddings", formValue: "Wedding" },
    { key: "private-party", label: "Private parties", formValue: "Private Party" },
    { key: "corporate", label: "Corporate events", formValue: "Corporate Event" },
    { key: "birthday", label: "Birthdays", formValue: "Birthday" },
    { key: "dinner-party", label: "Dinner parties", formValue: "Dinner Party" },
    { key: "other", label: "Something else", formValue: "Other" },
  ],
  true,
  "published",
  10,
  "app/page.tsx:10-19; components/ContactForm.tsx:30-37",
);

export const claims = {
  serviceArea: fact(
    "Rehoboth Beach, Philadelphia and Washington DC, and surrounding areas",
    false,
    "published",
    11,
    "app/layout.tsx; inconsistent with the AI's approved knowledge (owner to confirm)",
  ),
  experience: fact("8 years of professional bar experience", false, "published", 12, "app/layout.tsx; unverified in substance"),
  pastVenues: fact(
    ["Bardea Food & Drink", "Stingray Sushi Bar & Asian Grill", "Bodhi Kitchen", "Drift Seafood & Raw Bar"],
    false,
    "published",
    13,
    "app/layout.tsx; unverified in substance",
  ),
  menusInAdvance: fact("Every menu is written weeks before your event", false, "unverified", 14, "BartenderWidget.tsx (scripted bot copy)"),
  punctual: fact("Arrives ahead of schedule and sets up without fuss", false, "published", 15, "app/page.tsx:436 (a published promise)"),
  callback: fact("calls you back within 24 hours, personally", false, "published", 16, "app/page.tsx:431; app/contact/page.tsx (a published promise)"),
  alcoholAndLicensing: fact<string | null>(null, false, "missing", 17, "not on the site; the AI deflects the question"),
  djPartner: fact<string | null>(null, false, "unverified", 18, "app/page.tsx:329"),
  testimonials: fact<string[]>([], false, "missing", 26, "none anywhere"),
  eventPhotos: fact<string[]>([], false, "missing", 27, "none; public/ held only the hero video"),
} as const;

/* ── packages and pricing ────────────────────────────────────────── */

export type TierKey = "basic" | "standard" | "dj";

export interface Tier {
  key: TierKey;
  name: string;
  /** Published starting rate, USD per hour. */
  rate: Fact<number>;
  inclusions: Fact<string>[];
  /** The value the contact API's schema expects for `plan`. */
  formValue: string;
}

// The live site publishes these rates (facts #19–21), but the owner has not
// confirmed them for the redesign, so `verified` is false and the configurator
// stays in request-for-quote mode. Confirming a rate turns its estimate on.
export const tiers: Tier[] = [
  {
    key: "basic",
    name: "Basic",
    formValue: "Basic",
    rate: priceFact(75, false, "published", 19, "app/page.tsx:229-271"),
    inclusions: [
      fact("A professional bartender", false, "published", 19, "app/page.tsx:229-271"),
      fact("Hourly flat-rate service", false, "published", 19, "app/page.tsx:229-271"),
      fact("Standard bar setup", false, "published", 19, "app/page.tsx:229-271"),
    ],
  },
  {
    key: "standard",
    name: "Standard",
    formValue: "Standard",
    rate: priceFact(110, false, "published", 20, "app/page.tsx:275-324"),
    inclusions: [
      fact("Everything in Basic", false, "published", 20, "app/page.tsx:275-324"),
      fact("Two custom cocktails", false, "published", 20, "app/page.tsx:275-324"),
      fact("Dietary restrictions and allergies accommodated", false, "published", 20, "app/page.tsx:275-324"),
    ],
  },
  {
    key: "dj",
    name: "Bartender + DJ",
    formValue: "Bartender + DJ",
    rate: priceFact(160, false, "published", 21, "app/page.tsx:327-369"),
    inclusions: [
      fact("Everything in Standard", false, "published", 21, "app/page.tsx:327-369"),
      fact("A personalised cocktail menu", false, "published", 21, "app/page.tsx:327-369"),
      fact("A DJ (partner and equipment to confirm)", false, "unverified", 18, "app/page.tsx:329"),
    ],
  },
];

export const pricingTerms = {
  /** "+ additional hourly rate for parties over 50 guests": published, amount MISSING. */
  over50Threshold: fact(50, false, "published", 19, "app/page.tsx:229-271"),
  over50Surcharge: priceFact<number | null>(null, false, "missing", 22, "none: amount not published"),
  minimumHours: fact<number | null>(null, false, "missing", 22, "none"),
  travelFee: priceFact<number | null>(null, false, "missing", 22, "none"),
  deposit: priceFact<number | null>(null, false, "missing", 22, "none"),
  cancellation: fact<string | null>(null, false, "missing", 22, "none"),
} as const;

/* ── configurator extras ─────────────────────────────────────────── */

export type ExtraKey = "custom-cocktails" | "cocktail-menu" | "dj";

export interface Extra {
  key: ExtraKey;
  label: string;
  fact: Fact<string>;
}

// Requests the visitor can add to their card. They come from published
// package inclusions; none has a published price, so none is ever priced.
export const extras: Extra[] = [
  { key: "custom-cocktails", label: "Custom cocktails", fact: fact("Custom cocktails", false, "published", 20, "Standard inclusion, app/page.tsx") },
  { key: "cocktail-menu", label: "A personalised cocktail menu", fact: fact("A personalised cocktail menu", false, "published", 21, "Bartender + DJ inclusion, app/page.tsx") },
  { key: "dj", label: "A DJ", fact: fact("A DJ", false, "unverified", 18, "Bartender + DJ tier; partner unverified") },
];

/* ── privacy notice (/privacy) ───────────────────────────────────── */

export const privacyNotice = {
  /** The legal business name: the same open question as `business.legalEntity` (F25). */
  legalName: business.legalEntity,
  /** Where privacy questions go. MISSING: the site has no public email (F41). */
  contactEmail: fact<string | null>(null, false, "missing", 70, "none: owner to provide (FACTS-REGISTER F70)"),
  /** The date the notice takes effect, set when the owner approves it. */
  effectiveDate: fact<string | null>(null, false, "missing", 71, "none: owner to set on approval (FACTS-REGISTER F71)"),
  /**
   * The owner has approved the notice's text (FACTS-REGISTER F72). Until then
   * /privacy is noindex, stays out of the sitemap and, outside production,
   * carries a "Draft — pending owner review" marker.
   */
  approved: false as boolean,
} as const;

/* ── helpers ─────────────────────────────────────────────────────── */

type Env = Record<string, string | undefined>;

/**
 * Placeholders for unverified claims are visible everywhere except a Vercel
 * production deployment, where unverified lines are omitted instead.
 */
export function placeholdersVisible(env?: Env): boolean {
  // literal reads, so Next inlines NEXT_PUBLIC_VERCEL_ENV into client bundles
  // and server and client agree (no hydration mismatch)
  const v = env
    ? (env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV)
    : (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV);
  return v !== "production";
}

/** True for a money figure (see `Fact.kind`). */
export function isPrice<T>(f: Fact<T>): boolean {
  return f.kind === "price";
}

/**
 * A price figure, only once the owner has verified it. There is no
 * environment switch: dev, preview and production all get undefined while a
 * price is unverified, so no unconfirmed number is ever shown.
 */
export function priceValue<T>(f: Fact<T>): T | undefined {
  return f.verified && f.value !== null ? f.value : undefined;
}

/** The value if it may be stated as fact (pages, metadata, JSON-LD), else undefined. */
export function verifiedValue<T>(f: Fact<T>): T | undefined {
  return f.verified && f.value !== null ? f.value : undefined;
}

export const phone = business.phone.value;
