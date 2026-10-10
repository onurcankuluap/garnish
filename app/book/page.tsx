import type { Metadata } from "next";
import BookCard from "@/components/book/BookCard";
import { fromParams } from "@/lib/compose/selection";
import { tiers } from "@/lib/content/facts";
import { phone } from "@/lib/content/facts";
import { BASE_URL } from "@/lib/content/seo";

export const metadata: Metadata = {
  title: "Check your date",
  description: "Check your date with Garnish, a private bartender. Bring your card from Compose your bar, or call.",
  alternates: { canonical: `${BASE_URL}/book` },
};

/**
 * /book: stub with the final layout. The four-step booking flow (date,
 * guests and bar, venue, contact) on the durable lead system is Phase 7.
 * Until then the existing inquiry form at /contact takes the request, with
 * the chosen bar pre-selected.
 */
export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sel = fromParams(await searchParams);
  const plan = tiers.find((t) => t.key === sel.tier)?.formValue;
  const contactHref = plan ? `/contact?plan=${encodeURIComponent(plan)}` : "/contact";
  return (
    <main id="main" tabIndex={-1} className="inner">
      <div>
        <p className="eyebrow">
          <span className="r" aria-hidden="true" />
          <span className="rn">V.</span>&nbsp;Book
        </p>
        <h1>
          Check your <em>date.</em>
        </h1>
        <p className="lead">Four short steps. No payment, no account.</p>
        <div className="stub" data-extension="booking-flow">
          The date check is being built. For now, send the same details through the inquiry form, or call.
        </div>
        <div className="ctas" style={{ marginTop: 28 }}>
          <a className="btn btn-gold" href={contactHref}>
            Send your inquiry <span className="ar" aria-hidden="true" />
          </a>
          <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="book">
            or call {phone.display}
          </a>
        </div>
      </div>
      <BookCard fromUrl={sel} />
    </main>
  );
}
