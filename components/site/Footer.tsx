import Logo from "./Logo";
import Claim from "@/components/ui/Claim";
import { business, phone } from "@/lib/content/facts";
import { NAV, BOOK_HREF } from "@/lib/content/site";

export default function Footer() {
  return (
    <footer className="foot">
      <div>
        <Logo />
        <p style={{ marginTop: 18, maxWidth: 340 }}>
          Private bartending, based in {business.baseTown.value.label}.{" "}
          <Claim fact={business.email} missing="public email address: to confirm" />
        </p>
      </div>
      <nav aria-label="Footer">
        <h2>The menu</h2>
        <ul>
          {NAV.map((i) => (
            <li key={i.href}>
              <a href={i.href}>{"long" in i ? i.long : i.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        <h2>Book</h2>
        <ul>
          <li>
            <a href={BOOK_HREF} data-track="hero_cta" data-track-where="footer">Check your date</a>
          </li>
          <li>
            <a className="num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="footer">
              Call {phone.display}
            </a>
          </li>
          <li>
            <a href="/contact">Send an inquiry</a>
          </li>
        </ul>
      </div>
      <p className="fine">
        The AI concierge is an automated assistant, not a person. <a href="/privacy">How we handle your details</a>
      </p>
    </footer>
  );
}
