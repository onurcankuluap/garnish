import { describe, expect, it } from "vitest";
import { compose, DEFAULT_PRICING, EMPTY, clampGuests, clampHours, type PricingSource, type Selection } from "@/lib/compose/quote";
import { bookHref, fromParams, load, save, STORAGE_KEY, toParams } from "@/lib/compose/selection";
import { tiers, type Fact } from "@/lib/content/facts";

const full: Selection = { event: "wedding", guests: 40, hours: 4, tier: "standard", extras: [] };

/** The same facts with the given rates (and terms) confirmed by the owner. */
function confirmed(over: Partial<Record<"over50" | "minimum", number>> = {}): PricingSource {
  const ok = <T,>(f: Fact<T>, value?: T): Fact<T> => ({ ...f, value: value ?? f.value, verified: true });
  return {
    ...DEFAULT_PRICING,
    tiers: tiers.map((t) => ({ ...t, rate: ok(t.rate), inclusions: t.inclusions.map((i) => ok(i)) })),
    over50Threshold: ok(DEFAULT_PRICING.over50Threshold),
    over50Surcharge: over.over50 !== undefined ? ok(DEFAULT_PRICING.over50Surcharge, over.over50) : DEFAULT_PRICING.over50Surcharge,
    minimumHours: over.minimum !== undefined ? ok(DEFAULT_PRICING.minimumHours, over.minimum) : DEFAULT_PRICING.minimumHours,
  };
}

describe("compose: request-for-quote path (today: no rate is verified)", () => {
  it("every published rate is unverified, so a complete card is a request, with no number", () => {
    expect(tiers.every((t) => t.rate.verified === false)).toBe(true);
    const r = compose(full);
    expect(r.mode).toBe("request");
    expect(r.complete).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/\$\d|"from":/);
  });

  it("inclusions are carried with their verified flags (all false today)", () => {
    const r = compose(full);
    expect(r.inclusions.map((i) => i.text)).toContain("Two custom cocktails");
    expect(r.inclusions.every((i) => i.verified === false)).toBe(true);
  });

  it("an empty card lists what is still open and never computes", () => {
    const r = compose(EMPTY);
    expect(r.mode).toBe("request");
    if (r.mode !== "request") throw new Error();
    expect(r.openItems).toEqual(["the occasion", "the guest count", "the hours of service", "the bar"]);
  });

  it("a partial card stays a request even once rates are confirmed", () => {
    const r = compose({ ...full, hours: null }, confirmed());
    expect(r.mode).toBe("request");
  });
});

describe("compose: estimate path (rates confirmed in facts.ts)", () => {
  it("turns on, labelled 'Estimate, not a quote', = rate × hours", () => {
    const r = compose(full, confirmed());
    expect(r.mode).toBe("estimate");
    if (r.mode !== "estimate") throw new Error();
    expect(r.label).toBe("Estimate, not a quote");
    expect(r.from).toBe(110 * 4);
    expect(r.basis).toBe("4 h × $110 published starting rate");
  });

  it("never folds an unconfirmed over-50 surcharge into the number, but says so", () => {
    const r = compose({ ...full, guests: 80 }, confirmed());
    if (r.mode !== "estimate") throw new Error();
    expect(r.from).toBe(440);
    expect(r.canChange.join(" ")).toMatch(/over 50 guests add an hourly rate that is not included/);
  });

  it("names a confirmed surcharge and minimum as things that change the quote", () => {
    const r = compose({ ...full, guests: 80 }, confirmed({ over50: 25, minimum: 3 }));
    if (r.mode !== "estimate") throw new Error();
    expect(r.canChange.join(" ")).toMatch(/\$25 per hour/);
    expect(r.canChange.join(" ")).toMatch(/minimum of 3 hours/);
    expect(r.canChange.join(" ")).toMatch(/Alcohol is not included/);
  });

  it("extras are listed, never priced", () => {
    const r = compose({ ...full, extras: ["dj"] }, confirmed());
    if (r.mode !== "estimate") throw new Error();
    expect(r.from).toBe(440);
    expect(r.canChange.join(" ")).toMatch(/A DJ: priced in your quote/);
  });

  it("only the chosen tier's flag matters", () => {
    const src = confirmed();
    src.tiers = src.tiers.map((t) => (t.key === "standard" ? { ...t, rate: { ...t.rate, verified: false } } : t));
    expect(compose(full, src).mode).toBe("request");
    expect(compose({ ...full, tier: "basic" }, src).mode).toBe("estimate");
  });
});

describe("selection handoff", () => {
  it("round-trips through the URL", () => {
    const s: Selection = { event: "corporate", guests: 120, hours: 3.5, tier: "dj", extras: ["dj", "cocktail-menu"] };
    expect(fromParams(toParams(s))).toEqual(s);
    expect(bookHref(s)).toBe("/book?event=corporate&guests=120&hours=3.5&tier=dj&extras=dj%2Ccocktail-menu");
    expect(bookHref(EMPTY)).toBe("/book");
  });

  it("drops unknown or out-of-range values (record or URLSearchParams)", () => {
    expect(fromParams({ event: "rave", tier: "platinum", guests: "-4", hours: "99", extras: "fireworks,dj,dj" })).toEqual({
      event: null,
      guests: null,
      hours: null,
      tier: null,
      extras: ["dj"],
    });
    expect(fromParams(new URLSearchParams("guests=61&hours=4.2"))).toMatchObject({ guests: 61, hours: 4 });
    expect(fromParams({ event: ["wedding", "birthday"] }).event).toBe("wedding");
  });

  it("clamps steppers to sane limits", () => {
    expect(clampGuests(0)).toBe(1);
    expect(clampGuests(5000)).toBe(2000);
    expect(clampHours(0.2)).toBe(1);
    expect(clampHours(4.3)).toBe(4.5);
  });

  it("sessionStorage: saves and loads, and never throws when storage is blocked", () => {
    const mem = new Map<string, string>();
    const store = { setItem: (k: string, v: string) => void mem.set(k, v), getItem: (k: string) => mem.get(k) ?? null };
    expect(save(full, store)).toBe(true);
    expect(mem.get(STORAGE_KEY)).toBe("event=wedding&guests=40&hours=4&tier=standard");
    expect(load(store)).toEqual(full);
    const blocked = {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(save(full, blocked)).toBe(false);
    expect(load(blocked)).toEqual(EMPTY);
    expect(load(undefined)).toEqual(EMPTY);
  });
});
