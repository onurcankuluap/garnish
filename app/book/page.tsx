import type { Metadata } from "next";
import BookingFlow from "@/components/book/BookingFlow";
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
      <BookingFlow fromUrl={sel}>
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
