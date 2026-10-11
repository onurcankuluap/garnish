import Claim, { Placeholder } from "@/components/ui/Claim";
import StageMotion from "./StageMotion";
import { business, claims, eventTypes, phone, tiers } from "@/lib/content/facts";
import { NAV, BOOK_HREF } from "@/lib/content/site";

const D = "/campaign/hero-d";
const dSet = (ext: string) => [828, 1170, 1600, 2560].map((w) => `${D}-${w}.${ext} ${w}w`).join(", ");
const mSet = (name: string, ext: string) => [828, 1170].map((w) => `/campaign/${name}-${w}.${ext} ${w}w`).join(", ");
// the hero frame is min(88vh, 64vw) tall at aspect 1.25417, so at most 80vw / 110vh wide
const D_SIZES = "min(80vw, 110vh)";

const occasions = eventTypes.value.filter((e) => e.key !== "other");
const basic = tiers.find((t) => t.key === "basic")!;
const standard = tiers.find((t) => t.key === "standard")!;

/**
 * 01 Cinematic arrival + 02 Plate I: The bar (+ 03, the occasions list).
 * Server-rendered and fully composed without JavaScript; StageMotion adds
 * the scroll choreography on capable devices.
 */
export default function Stage() {
  const town = business.baseTown.value;
  return (
    <section className="stage" id="stage" aria-label="Your evening, composed">
      <div className="pin">
        <div className="hero" data-s="hero">
          <div className="photo" data-s="photo">
            <div className="frame" data-s="frame">
              <div className="lift">
                <picture>
                  <source media="(max-width: 860px)" type="image/avif" srcSet={mSet("hero-m", "avif")} sizes="106vw" />
                  <source media="(max-width: 860px)" type="image/webp" srcSet={mSet("hero-m", "webp")} sizes="106vw" />
                  <source type="image/avif" srcSet={dSet("avif")} sizes={D_SIZES} />
                  <img
                    className="still"
                    data-s="still"
                    src={`${D}-1600.webp`}
                    srcSet={dSet("webp")}
                    sizes={D_SIZES}
                    width={1600}
                    height={1276}
                    decoding="async"
                    alt="An old fashioned over one clear ice cube with an orange-peel twist, smoke rising, on graphite stone."
                  />
                </picture>
              </div>
            </div>
            <span className="falloff" data-s="falloff" aria-hidden="true" />
            <span className="dim" data-s="dim" aria-hidden="true" />
          </div>

          <div className="copy" data-s="copy">
            <span className="grid-v g1" aria-hidden="true" />
            <span className="grid-v g2" aria-hidden="true" />
            <span className="grid-v g3" aria-hidden="true" />
            <h1>
              <span className="kick">
                <span className="r" aria-hidden="true" />
                <span>
                  Private bartending · {town.locality}
                  <span className="dnm">, {town.region}</span>
                </span>
              </span>
              <span className="disp">
                <span className="l">Your evening,</span> <span className="l l2"><em>composed.</em></span>
              </span>
            </h1>
            <div className="below">
              <p className="lead">
                A professional bartender and a considered bar for{" "}
                {occasions.map((o, i) => `${i === occasions.length - 1 ? "and " : ""}${o.label.toLowerCase()}`).join(", ").replace(", and", " and")}.
              </p>
              <div className="ctas">
                <a className="btn btn-gold" href={BOOK_HREF} data-track="hero_cta" data-track-where="hero">
                  Check your date <span className="ar" aria-hidden="true" />
                </a>
                <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="hero">
                  or call {phone.display}
                </a>
              </div>
            </div>
            <p className="msub">A bartender and a considered bar, for weddings, parties and dinners.</p>
            <p className="plate-cap">
              <b>Plate I</b>Stirred, over one clear cube
            </p>
            <div className="rail">
              <span className="p">
                <Claim fact={claims.callback}>
                  {business.ownerFirstName.value} {claims.callback.value}
                </Claim>
              </span>
              <nav className="idx" aria-label="Courses">
                {NAV.slice(0, 4).map((i) => (
                  <a key={i.href} href={i.href}>
                    <em>{i.n}</em>
                    {"long" in i ? i.long : i.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* smoke-only luminance matte, registered to the photograph, ABOVE the type */}
          <div className="smoke" data-s="smoke" aria-hidden="true">
            <div className="sframe" data-s="sframe">
              <div className="slift">
                <div className="sstill" data-s="sstill">
                  <picture>
                    <source media="(max-width: 860px)" type="image/avif" srcSet="/campaign/smoke-m-828.avif" />
                    <source media="(max-width: 860px)" type="image/webp" srcSet="/campaign/smoke-m-828.webp" />
                    <source type="image/avif" srcSet="/campaign/smoke-d-1600.avif" />
                    <img src="/campaign/smoke-d-1600.webp" alt="" decoding="async" width={1600} height={1276} />
                  </picture>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════ The menu card: "I. The bar" ════ */}
        <div className="card paper" id="the-bar" data-s="card">
          <div className="head" data-d="head">
            <p className="eyebrow">
              <span className="r" aria-hidden="true" />
              <span className="rn">I.</span>&nbsp;The bar
            </p>
            <h2 className="h2">
              One bartender.
              <br />
              Your <em>whole</em> evening.
            </h2>
            <p className="lead">Choose the occasion; see what arrives with it; carry it into your date check.</p>
          </div>
          <figure className="plate-fig">
            <div className="plate-slot" data-s="slot">
              <picture>
                <source media="(max-width: 860px)" type="image/avif" srcSet={mSet("plate-m", "avif")} sizes="calc(100vw - 40px)" />
                <source media="(max-width: 860px)" type="image/webp" srcSet={mSet("plate-m", "webp")} sizes="calc(100vw - 40px)" />
                <source type="image/avif" srcSet={dSet("avif")} sizes={D_SIZES} />
                <img
                  src={`${D}-1600.webp`}
                  srcSet={dSet("webp")}
                  sizes={D_SIZES}
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={1276}
                  alt="Plate I: the same old fashioned, framed on the menu card."
                />
              </picture>
            </div>
            <figcaption className="platecap" data-d="cap">
              <span>
                <em>Plate I.</em>Stirred, over one clear cube
              </span>
            </figcaption>
          </figure>
          <ol className="course" id="services" aria-label="Occasions">
            {occasions.map((o, i) => (
              <li key={o.key} className={i === 0 ? "on" : undefined}>
                <span className="rn">{["i.", "ii.", "iii.", "iv.", "v."][i]}</span>
                <span className="t">
                  {o.label} <span className="dots" />
                </span>
                {i === 0 && (
                  <span className="s">
                    <Placeholder>One line from the owner: what a wedding bar looks like with Garnish</Placeholder>
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="incl" data-d="incl">
            <div>
              <b>Every bar</b>
              <span>
                <Claim fact={basic.inclusions[0]}>
                  {basic.inclusions.map((f, i) => (i === 0 ? f.value.replace(/^A p/, "P") : f.value.toLowerCase())).join(", ")}
                </Claim>
              </span>
            </div>
            <div>
              <b>From Standard</b>
              <span>
                <Claim fact={standard.inclusions[1]}>Two custom cocktails; dietary needs accommodated</Claim>
              </span>
            </div>
            <div>
              <b>Not yet stated</b>
              <span>
                <Claim fact={claims.alcoholAndLicensing} missing="Alcohol, licensing, insurance: to confirm" />
              </span>
            </div>
          </div>
        </div>
      </div>
      <StageMotion target="stage" />
    </section>
  );
}
