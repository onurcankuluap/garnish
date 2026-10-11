import type { Metadata } from "next";
import Claim from "@/components/ui/Claim";
import { business, phone, placeholdersVisible, privacyNotice } from "@/lib/content/facts";
import { BASE_URL } from "@/lib/content/seo";
import { retentionDays } from "@/lib/leads/types";
import "../styles/privacy.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Garnish handles the details you send: what is kept, where, and for how long.",
  alternates: { canonical: `${BASE_URL}/privacy` },
  // a draft until the owner approves the text (privacyNotice.approved in facts.ts)
  robots: privacyNotice.approved ? undefined : { index: false, follow: true },
};

const owner = business.ownerFirstName.value;

/**
 * /privacy: a draft notice built only from what the code verifiably does
 * (lead store, notifier, hosting, concierge upstream, rate limiting, no
 * cookies or analytics). The legal name, a privacy email and the effective
 * date are unverified facts: placeholders outside production, omitted in it.
 */
export default function PrivacyPage() {
  const days = retentionDays();
  const draft = !privacyNotice.approved && placeholdersVisible();
  return (
    <main id="main" tabIndex={-1} className="inner pv">
      <header className="pv-head">
        <p className="eyebrow">
          <span className="r" aria-hidden="true" />
          Privacy
        </p>
        <h1>
          Your <em>details.</em>
        </h1>
        <p className="lead">What happens to what you send Garnish, in plain words.</p>
        <p className="pv-meta">
          <Claim fact={privacyNotice.effectiveDate} missing="Effective date: to confirm">
            Effective {privacyNotice.effectiveDate.value}.
          </Claim>
        </p>
        {draft && (
          <p className="pv-draft" role="note">
            Draft — pending owner review
          </p>
        )}
      </header>

      <div className="pv-body">
        <section aria-labelledby="pv-who">
          <h2 id="pv-who">Who we are</h2>
          <p>
            Garnish is {business.owner.value}&rsquo;s private bartending service, based in {business.baseTown.value.label}.{" "}
            <Claim fact={privacyNotice.legalName} missing="Legal business name: to confirm">
              Its legal name is {privacyNotice.legalName.value}.
            </Claim>
          </p>
        </section>

        <section aria-labelledby="pv-what">
          <h2 id="pv-what">What you send us</h2>
          <p>
            When you check your date or send an inquiry, we receive what you enter: your name, phone number, email address if you give one,
            the occasion, date and time, the town or venue, guest count, hours, the bar and extras you choose, how you&rsquo;d like to be
            contacted, and any notes. It goes to {owner}, to get back to you about your event.
          </p>
          <p>No IP address, browser details or tracking data are stored with your request.</p>
        </section>

        <section aria-labelledby="pv-where">
          <h2 id="pv-where">Where it is kept, and for how long</h2>
          <p>
            Your request is stored in a database run by Upstash (Redis) for up to {days} days, then deleted automatically. A copy is emailed
            to {owner} through Resend, an email delivery service; that email is not covered by the {days}-day deletion.
          </p>
          <p>This site is hosted by Vercel.</p>
        </section>

        <section aria-labelledby="pv-ai">
          <h2 id="pv-ai">The AI concierge</h2>
          <p>
            Questions about the business itself, such as booking, the bar options or the events {owner} works, are answered on this page from
            the site&rsquo;s own facts and are not sent anywhere.
          </p>
          <p>
            Other questions are sent, as text only, to Garnish&rsquo;s AI service, hosted on Amazon Web Services (AWS), to write a reply. This
            site does not store the conversation. Please keep personal details out of the chat; use the booking form or call instead.
          </p>
        </section>

        <section aria-labelledby="pv-limits">
          <h2 id="pv-limits">Limits on repeat requests</h2>
          <p>
            To prevent abuse, the site counts requests from each visitor for a short time. It recognises a visitor by a salted, one-way hash of
            the IP address, so no readable IP address is stored.
          </p>
        </section>

        <section aria-labelledby="pv-cookies">
          <h2 id="pv-cookies">Cookies and analytics</h2>
          <p>
            This site sets no cookies and runs no analytics. Your browser keeps two small things in its session storage, which it clears when
            you close the tab: the card you compose in Compose your bar, and whether you have already seen the home page&rsquo;s opening.
          </p>
          <p>Analytics may be added later. If it is, this page will be updated.</p>
        </section>

        <section aria-labelledby="pv-ask">
          <h2 id="pv-ask">Questions</h2>
          <p>
            To ask about your details, call {owner} on{" "}
            <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="privacy">
              {phone.display}
            </a>
            .{" "}
            <Claim fact={privacyNotice.contactEmail} missing="Privacy contact email: to confirm">
              Or email{" "}
              <a className="tlink" href={`mailto:${privacyNotice.contactEmail.value}`}>
                {privacyNotice.contactEmail.value}
              </a>
              .
            </Claim>
          </p>
        </section>
      </div>
    </main>
  );
}
