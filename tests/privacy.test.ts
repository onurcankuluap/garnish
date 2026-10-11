import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPage, { metadata } from "@/app/privacy/page";
import sitemap from "@/app/sitemap";
import { privacyNotice } from "@/lib/content/facts";

const render = () => renderToStaticMarkup(createElement(PrivacyPage));
const env = (v: string) => {
  vi.stubEnv("VERCEL_ENV", v);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", v);
};

afterEach(() => vi.unstubAllEnvs());

describe("/privacy (draft notice)", () => {
  it("the unverified facts are open questions, and the page is not approved", () => {
    for (const f of [privacyNotice.legalName, privacyNotice.contactEmail, privacyNotice.effectiveDate]) {
      expect(f.verified).toBe(false);
      expect(f.value).toBeNull();
    }
    expect(privacyNotice.approved).toBe(false);
  });

  it("states only the verified technical facts", () => {
    env("");
    const html = render();
    for (const s of ["90 days", "Upstash", "Resend", "Vercel", "Amazon Web Services (AWS)", "salted, one-way hash", "sets no cookies", "runs no analytics", "+1 302-542-3147", "tel:+13025423147"]) {
      expect(html).toContain(s);
    }
    // the AWS services behind the concierge are unverified (F61)
    expect(html).not.toMatch(/Bedrock|Lambda|API Gateway|Nova/);
  });

  it("outside production: draft marker and placeholders for the legal name, privacy email and effective date", () => {
    env("preview");
    const html = render();
    expect(html).toContain("Draft — pending owner review");
    expect(html).toContain("[Legal business name: to confirm]");
    expect(html).toContain("[Privacy contact email: to confirm]");
    expect(html).toContain("[Effective date: to confirm]");
  });

  it("in production: no draft marker, no placeholders, nothing unverified", () => {
    env("production");
    const html = render();
    expect(html).not.toContain("Draft");
    expect(html).not.toContain("to confirm");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("Effective");
  });

  it("is noindex and out of the sitemap until the owner approves it", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(sitemap().map((e) => e.url)).not.toContain("https://www.garnish.info/privacy");
  });
});
