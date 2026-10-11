import type { Metadata } from "next";
import BookingFlow from "@/components/book/BookingFlow";
import Pic from "@/components/ui/Pic";
import { fromParams } from "@/lib/compose/selection";
import { BASE_URL } from "@/lib/content/seo";
import "../styles/book.css";

export const metadata: Metadata = {
  title: "Check your date",
  description: "Check your date with Garnish, a private bartender. Bring your card from Compose your bar, or call.",
  alternates: { canonical: `${BASE_URL}/book` },
};

/**
 * /book: the booking flow (components/book/BookingFlow) on the durable lead
 * system. The card from Compose your bar arrives in the URL (or from the
 * session) and fills the bar step.
 */
export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sel = fromParams(await searchParams);
  return (
    <main id="main" tabIndex={-1} className="inner book">
      {/* phones: a short band above the heading, first in the document so it
          is laid out before the streamed form (no shift) */}
      <div className="pg-art bk-band">
        <Pic
          name="book-glasses-m"
          width={1440}
          height={480}
          sizes="calc(100vw - 40px)"
          blank="(min-width: 861px)"
          eager
          alt="Polished glasses on a dark bar top by candlelight: a coupe, a cut-crystal tumbler, a highball and a wine glass."
        />
      </div>
      <BookingFlow
        fromUrl={sel}
        art={
          <div className="pg-art bk-art">
            <Pic
              name="book-glasses-d"
              width={1440}
              height={960}
              sizes="41vw"
              blank="(max-width: 860px)"
              eager
              alt="Polished glasses on a dark bar top by candlelight: a coupe, a cut-crystal tumbler, a highball and a wine glass beside a folded white napkin."
            />
          </div>
        }
      >
        <p className="eyebrow">
          <span className="r" aria-hidden="true" />
          <span className="rn">V.</span>&nbsp;Book
        </p>
        <h1>
          Check your <em>date.</em>
        </h1>
        <p className="lead">Five short steps. No payment, no account.</p>
      </BookingFlow>
    </main>
  );
}
