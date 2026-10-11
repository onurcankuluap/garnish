import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Claim from "@/components/ui/Claim";
import Compose from "@/components/home/Compose";
import { Faq } from "@/components/home/Sections";
import { isPrice, placeholdersVisible, priceValue, pricingTerms, tiers, type Fact, type Tier } from "@/lib/content/facts";
import { compose, planOptionLabel, tierRateLabel, verifiedRatesLine } from "@/lib/compose/quote";
import { localAnswer } from "@/lib/concierge/grounding";

/** Any money figure: "$75", "$ 110", "75/hr", "110 / hr", "160 per hour". */
const FIGURE = /\$\s?\d|\b\d+\s?\/\s?hr\b|\b\d+ per hour\b/i;

const confirm = (t: Tier): Tier => ({ ...t, rate: { ...t.rate, verified: true } });

afterEach(() => vi.unstubAllEnvs());

describe("prices: unverified figures are hidden in every environment", () => {
  it("rates, surcharge, travel fee and deposit are price facts, all unverified today", () => {
    const prices: Fact<unknown>[] = [...tiers.map((t) => t.rate), pricingTerms.over50Surcharge, pricingTerms.travelFee, pricingTerms.deposit];
    for (const f of prices) {
      expect(isPrice(f)).toBe(true);
      expect(f.verified).toBe(false);
      expect(priceValue(f)).toBeUndefined();
    }
    // non-price facts are not marked
    expect(isPrice(pricingTerms.minimumHours)).toBe(false);
    expect(isPrice(pricingTerms.over50Threshold)).toBe(false);
  });

  it("the quote helpers give no label, no rates line and plain package names", () => {
    for (const t of tiers) {
      expect(tierRateLabel(t)).toBeNull();
      expect(planOptionLabel(t)).toBe(t.name);
    }
    expect(verifiedRatesLine()).toBeNull();
  });

  for (const env of ["development", "preview", "production"] as const) {
    it(`renders no figure in ${env} (configurator, FAQ, Claim)`, () => {
      vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", env === "development" ? "" : env);
      vi.stubEnv("VERCEL_ENV", env === "development" ? "" : env);
      expect(placeholdersVisible()).toBe(env !== "production");

      const compose = renderToStaticMarkup(createElement(Compose));
      expect(compose).not.toMatch(FIGURE);
      expect(compose).toContain("By quote");
      expect(compose).toContain("A quote, by request.");
      expect(compose).not.toContain("Estimate, not a quote");

      const faq = renderToStaticMarkup(createElement(Faq));
      expect(faq).not.toMatch(FIGURE);
      expect(faq).toContain("Every evening gets a personal quote");

      // a price fact with a value but unverified: never printed, even with "[to confirm]"
      const rate = tiers[1].rate;
      expect(renderToStaticMarkup(createElement(Claim, { fact: rate }, "from $110 / hr"))).toBe("");
      const withMissing = renderToStaticMarkup(createElement(Claim, { fact: rate, missing: "rate to confirm" }));
      expect(withMissing).not.toMatch(/110/);
      expect(withMissing).toEqual(env === "production" ? "" : expect.stringContaining("[rate to confirm]"));
    });
  }

  it("non-price unverified claims keep the dev placeholder behaviour", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    const f: Fact<string> = { value: "8 years", verified: false, status: "published", register: 12, source: "x" };
    expect(renderToStaticMarkup(createElement(Claim, { fact: f }))).toContain("[to confirm]");
    expect(renderToStaticMarkup(createElement(Claim, { fact: f }))).toContain("8 years");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(renderToStaticMarkup(createElement(Claim, { fact: f }))).toBe("");
  });

  it("the concierge's local price answer states no figure", () => {
    const a = localAnswer("How much do you charge per hour?");
    expect(a?.text).toBeDefined();
    expect(a!.text).not.toMatch(FIGURE);
    expect(a!.text).toMatch(/personal quote/);
  });

  it("the review step and owner email carry the package name only (no rate)", async () => {
    const { buildInquiryEmail } = await import("@/lib/contact/email");
    const lead = {
      id: "0123456789abcdef",
      createdAt: "2026-10-10T12:00:00.000Z",
      data: { name: "Ada Host", phone: "3025550100", email: "", eventType: "Wedding", eventDate: "2027-06-12", guestCount: "40", details: "", plan: "Standard" },
    } as unknown as Parameters<typeof buildInquiryEmail>[0];
    const mail = buildInquiryEmail(lead);
    expect(mail.html + mail.text + mail.subject).not.toMatch(FIGURE);
  });
});

describe("prices: once the owner verifies a rate", () => {
  it("the tier shows its starting rate, the FAQ line lists it, the form option names it", () => {
    const std = confirm(tiers[1]);
    expect(priceValue(std.rate)).toBe(110);
    expect(tierRateLabel(std)).toBe("from $110 / hr");
    expect(verifiedRatesLine([tiers[0], std, tiers[2]])).toBe("Standard from $110/hr");
    expect(planOptionLabel(std)).toBe("Standard — Starting at $110/hr");
  });

  it("a verified price fact renders through Claim", () => {
    const std = confirm(tiers[1]);
    expect(renderToStaticMarkup(createElement(Claim, { fact: std.rate }, "from $110 / hr"))).toBe("from $110 / hr");
  });

  it("the configurator switches to 'Estimate, not a quote'", () => {
    const r = compose(
      { event: "wedding", guests: 40, hours: 4, tier: "standard", extras: [] },
      {
        tiers: tiers.map((t) => (t.key === "standard" ? confirm(t) : t)),
        over50Threshold: pricingTerms.over50Threshold,
        over50Surcharge: pricingTerms.over50Surcharge,
        minimumHours: pricingTerms.minimumHours,
        travelFee: pricingTerms.travelFee,
        deposit: pricingTerms.deposit,
      },
    );
    expect(r.mode).toBe("estimate");
    if (r.mode !== "estimate") throw new Error();
    expect(r.label).toBe("Estimate, not a quote");
    expect(r.from).toBe(440);
  });
});
