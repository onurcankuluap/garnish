import { describe, expect, it } from "vitest";
import { business, claims, eventTypes, extras, placeholdersVisible, pricingTerms, tiers, verifiedValue } from "@/lib/content/facts";
import { DESCRIPTION, SITE_TITLE, jsonLd } from "@/lib/content/seo";
import { EVENT_TYPES, PLAN_NAMES } from "@/lib/contact/schema";
import { sanitize, setAnalyticsSink, track } from "@/lib/analytics";

const all = [
  ...Object.values(business),
  ...Object.values(claims),
  ...Object.values(pricingTerms),
  eventTypes,
  ...tiers.flatMap((t) => [t.rate, ...t.inclusions]),
  ...extras.map((e) => e.fact),
];

describe("facts register", () => {
  it("every claim carries value, verified, status, register row and source", () => {
    for (const f of all) {
      expect(typeof f.verified).toBe("boolean");
      expect(["published", "system", "unverified", "missing"]).toContain(f.status);
      expect(f.register).toBeGreaterThan(0);
      expect(f.source.length).toBeGreaterThan(2);
      expect(f).toHaveProperty("value");
    }
  });

  it("nothing UNVERIFIED or MISSING is marked verified", () => {
    for (const f of all) if (f.status === "unverified" || f.status === "missing") expect(f.verified).toBe(false);
  });

  it("mirrors facts.md statuses for the key rows", () => {
    expect(claims.serviceArea).toMatchObject({ status: "published", verified: false, register: 11 });
    expect(claims.experience).toMatchObject({ status: "published", verified: false, register: 12 });
    expect(claims.djPartner).toMatchObject({ status: "unverified", register: 18 });
    expect(pricingTerms.over50Surcharge).toMatchObject({ status: "missing", value: null });
    expect(business.email).toMatchObject({ status: "missing", value: null });
    expect(tiers.map((t) => [t.rate.value, t.rate.register])).toEqual([[75, 19], [110, 20], [160, 21]]);
  });

  it("event types and plans match the contact API's schema", () => {
    expect(eventTypes.value.map((e) => e.formValue)).toEqual([...EVENT_TYPES]);
    expect(tiers.map((t) => t.formValue)).toEqual([...PLAN_NAMES]);
  });

  it("verifiedValue gives only verified, present values", () => {
    expect(verifiedValue(business.phone)?.tel).toBe("+13025423147");
    expect(verifiedValue(claims.experience)).toBeUndefined();
    expect(verifiedValue(business.email)).toBeUndefined();
  });

  it("placeholders are hidden only in a Vercel production deployment", () => {
    expect(placeholdersVisible({})).toBe(true);
    expect(placeholdersVisible({ VERCEL_ENV: "preview" })).toBe(true);
    expect(placeholdersVisible({ VERCEL_ENV: "production" })).toBe(false);
    expect(placeholdersVisible({ NEXT_PUBLIC_VERCEL_ENV: "production" })).toBe(false);
  });
});

describe("metadata and JSON-LD carry verified facts only", () => {
  const text = JSON.stringify(jsonLd()) + DESCRIPTION + SITE_TITLE;
  it("contains the verified identity", () => {
    expect(text).toContain("+13025423147");
    expect(text).toContain("Rehoboth Beach");
    expect(text).toContain("Onur Kulualp");
  });
  it("never contains an unverified claim", () => {
    for (const bad of ["Philadelphia", "Washington", "8 years", "Bardea", "Stingray", "$75", "75", "24 hours", "priceRange", "areaServed", "hasCredential"]) {
      expect(text).not.toContain(bad);
    }
  });
});

describe("analytics", () => {
  it("is a no-op without a sink and never throws", () => {
    setAnalyticsSink(null);
    expect(() => track("hero_cta", { where: "hero" })).not.toThrow();
    setAnalyticsSink(() => {
      throw new Error("provider down");
    });
    expect(() => track("call_click")).not.toThrow();
    setAnalyticsSink(null);
  });
  it("strips personal data from props", () => {
    expect(sanitize({ where: "hero", name: "Jane", email: "a@b.c", phone: "3025550100", tier: "standard", note: "x", code: "ref 12345678" })).toEqual({
      where: "hero",
      tier: "standard",
    });
  });
  it("passes sanitized events to an attached sink", () => {
    const seen: unknown[] = [];
    setAnalyticsSink((e, p) => seen.push([e, p]));
    track("package_select", { tier: "dj", email: "x@y.z" });
    setAnalyticsSink(null);
    expect(seen).toEqual([["package_select", { tier: "dj" }]]);
  });
});
