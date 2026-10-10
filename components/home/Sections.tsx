import type { ReactNode } from "react";
import Claim, { Placeholder } from "@/components/ui/Claim";
import { Coupe } from "@/components/site/Logo";
import { business, claims, eventTypes, phone, pricingTerms, tiers } from "@/lib/content/facts";
import { BOOK_HREF } from "@/lib/content/site";
import { usd } from "@/lib/compose/quote";

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

/** 05 The experience: room for real event photographs, never generated ones. */
export function Evenings() {
  const frames = ["A wedding bar, mid-service", "The cocktail in a guest's hand", "The setup, before the doors open"];
  return (
    <section className="sec dark" id="evenings" aria-labelledby="evenings-h">
      <div className="sec-head">
        <Eyebrow n="III.">Evenings</Eyebrow>
        <h2 className="h2" id="evenings-h">
          The evening, <em>as it was.</em>
        </h2>
        <p className="lead">Photographs from real Garnish events will sit here. Until then, the frames stay empty rather than staged.</p>
      </div>
      <div className="ev-grid">
        {frames.map((f) => (
          <figure className="ev-ph" key={f} aria-label={`Placeholder: real Garnish event photo needed (${f})`}>
            <b>Real Garnish event photo needed</b>
            <span>{f}</span>
          </figure>
        ))}
      </div>
      <p className="coupe-div" aria-hidden="true">
        <Coupe width={22} height={28} />
      </p>
    </section>
  );
}

/** 06 About: verified facts only; everything else is a marked placeholder. */
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
        <div className="portrait" role="img" aria-label="Placeholder: owner portrait needed">
          <Placeholder>Portrait of {business.ownerFirstName.value} needed (a real photograph)</Placeholder>
        </div>
      </div>
    </section>
  );
}

/** 07 FAQ: an accessible disclosure list (<details>/<summary>). */
export function Faq() {
  const rates = tiers.map((t) => `${t.name} from ${usd(t.rate.value)}/hr`).join(", ");
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
            Published starting rates: <Claim fact={tiers[0].rate}>{rates}</Claim>. Parties over {pricingTerms.over50Threshold.value} guests have an
            additional hourly rate: <Claim fact={pricingTerms.over50Surcharge} missing="amount to confirm" />
          </p>
          <p>
            Minimum hours, travel and deposit: <Claim fact={pricingTerms.minimumHours} missing="to confirm" />. Compose your bar to send your
            card for a personal quote.
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
