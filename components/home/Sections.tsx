import type { ReactNode } from "react";
import Claim, { Placeholder } from "@/components/ui/Claim";
import { Coupe } from "@/components/site/Logo";
import { AboutStill, EveningsGrid } from "./Stills";
import { business, claims, eventTypes, phone, pricingTerms } from "@/lib/content/facts";
import { BOOK_HREF } from "@/lib/content/site";
import { verifiedRatesLine } from "@/lib/compose/quote";

function Eyebrow({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <p className="eyebrow">
      <span className="r" aria-hidden="true" />
      {n && <span className="rn">{n}</span>}
      {n && " "}
      {children}
    </p>
  );
}

/**
 * 05 Evenings: mood, not documentation. Three still lifes of the craft (glass,
 * ice, citrus, candlelight); none of them shows a Garnish event, venue or
 * guest, and the copy and captions describe only the objects.
 */
export function Evenings() {
  return (
    <section className="sec dark" id="evenings" aria-labelledby="evenings-h">
      <div className="sec-head">
        <Eyebrow n="III.">Evenings</Eyebrow>
        <h2 className="h2" id="evenings-h">
          The evening, <em>in detail.</em>
        </h2>
        <p className="lead">Glass, ice, citrus and candlelight: the small things an evening is made of.</p>
      </div>
      <EveningsGrid />
      <p className="coupe-div" aria-hidden="true">
        <Coupe width={22} height={28} />
      </p>
    </section>
  );
}

/** 06 About: verified facts only; everything else is a marked placeholder. The still shows the tools, not the owner. */
export function About() {
  return (
    <section className="sec paper" id="about" aria-labelledby="about-h">
      <div className="about">
        <div>
          <Eyebrow n="IV.">About</Eyebrow>
          <h2 className="h2" id="about-h" style={{ marginTop: 22 }}>
            Behind the <em>bar.</em>
          </h2>
          <div className="body">
            <p>
              Garnish is {business.owner.value}&rsquo;s private bartending service, based in {business.baseTown.value.label}. It works{" "}
              {eventTypes.value
                .filter((e) => e.key !== "other")
                .map((e) => e.label.toLowerCase())
                .join(", ")
                .replace(/, ([^,]*)$/, " and $1")}
              .
            </p>
            <p>
              <Placeholder>In {business.ownerFirstName.value}&rsquo;s own words: how an evening runs, a few lines</Placeholder>
            </p>
          </div>
          <ul className="facts">
            <li>
              <b>Experience</b>
              <span>
                <Claim fact={claims.experience} />
              </span>
            </li>
            <li>
              <b>Behind the bar at</b>
              <span>
                <Claim fact={claims.pastVenues}>{claims.pastVenues.value.join(", ")}</Claim>
              </span>
            </li>
            <li>
              <b>Travels to</b>
              <span>
                <Claim fact={claims.serviceArea} />
              </span>
            </li>
            <li>
              <b>On the day</b>
              <span>
                <Claim fact={claims.punctual} />
              </span>
            </li>
          </ul>
        </div>
        <AboutStill />
      </div>
    </section>
  );
}

/** 07 FAQ: an accessible disclosure list (<details>/<summary>). */
export function Faq() {
  // only verified rates, in every environment; null today (request-for-quote)
  const rates = verifiedRatesLine();
  const items: { q: string; a: ReactNode }[] = [
    {
      q: "Which events do you work?",
      a: (
        <p>
          {eventTypes.value
            .filter((e) => e.key !== "other")
            .map((e) => e.label)
            .join(", ")
            .replace(/, ([^,]*)$/, " and $1")}
          . If yours is something else, check your date anyway and describe it.
        </p>
      ),
    },
    {
      q: "Where are you based, and do you travel?",
      a: (
        <p>
          Garnish is based in {business.baseTown.value.label}. Further afield: <Claim fact={claims.serviceArea} />
        </p>
      ),
    },
    {
      q: "What does it cost?",
      a: (
        <>
          <p>
            {rates ? (
              <>
                Published starting rates: {rates}. {business.ownerFirstName.value} confirms the final quote.
              </>
            ) : (
              <>Every evening gets a personal quote: compose your bar, send your card, and {business.ownerFirstName.value} sends one.</>
            )}{" "}
            Parties over {pricingTerms.over50Threshold.value} guests have an additional hourly rate.
          </p>
          <p>
            Minimum hours, travel and deposit aren&rsquo;t published yet; {business.ownerFirstName.value} confirms them with your quote.
          </p>
        </>
      ),
    },
    {
      q: "Do you supply the alcohol? Are you licensed and insured?",
      a: (
        <p>
          <Claim fact={claims.alcoholAndLicensing} missing="Alcohol supply, licensing and liability insurance: to confirm" />
        </p>
      ),
    },
    {
      q: "How do I book?",
      a: (
        <p>
          Check your date: send the occasion, the date and your card, or call{" "}
          <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="faq">
            {phone.display}
          </a>
          . <Claim fact={claims.callback}>{business.ownerFirstName.value} {claims.callback.value}.</Claim>
        </p>
      ),
    },
    {
      q: "Is the chat a person?",
      a: (
        <p>
          No. The AI concierge is an automated assistant, not {business.ownerFirstName.value}. It can make mistakes, so confirm details when you book.
        </p>
      ),
    },
  ];
  return (
    <section className="sec graphite rule-top" id="faq" aria-labelledby="faq-h">
      <div className="faq">
        <div className="sec-head">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="h2" id="faq-h">
            Before you <em>ask.</em>
          </h2>
        </div>
        <div className="faq-list">
          {items.map((it) => (
            <details key={it.q}>
              <summary>
                {it.q}
                <i aria-hidden="true" />
              </summary>
              <div className="ans">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 08 The booking band. */
export function BookBand() {
  return (
    <section className="band" id="book" aria-labelledby="book-h">
      <div>
        <Eyebrow n="V.">Book</Eyebrow>
        <h2 className="h2" id="book-h">
          Check your <em>date.</em>
        </h2>
        <p className="lead">
          No payment, no account. <Claim fact={claims.callback}>{business.ownerFirstName.value} {claims.callback.value}.</Claim>
        </p>
      </div>
      <div className="ctas">
        <a className="btn btn-gold" href={BOOK_HREF} data-track="hero_cta" data-track-where="band">
          Check your date <span className="ar" aria-hidden="true" />
        </a>
        <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="band">
          or call {phone.display}
        </a>
      </div>
    </section>
  );
}
