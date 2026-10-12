"use client";

import Pic from "@/components/ui/Pic";

/*
 * The home page's stills (Evenings, About). A client module only so their
 * markup is not repeated in the RSC payload: the server HTML still carries
 * every <picture>, while the document stays inside one TCP initial window
 * (~14.6 KB gzip) like main. No state, no effects.
 */
const EVENINGS = [
  {
    name: "ev-setup",
    w: 1440,
    h: 1440,
    cap: "Set before the doors open",
    alt: "A bar tray set before service: a crystal coupe, a brass jigger, bitters bottles, citrus peel, clear ice and a lit candle.",
  },
  {
    name: "ev-coupes",
    w: 1440,
    h: 1800,
    cap: "Two to start",
    alt: "Two flutes of a sparkling cocktail with lemon twists, string lights behind.",
  },
  {
    name: "ev-twist",
    w: 1440,
    h: 1800,
    cap: "The twist",
    alt: "A red cocktail in a coupe, an orange-peel twist on the rim and a mist of citrus oil.",
  },
];

export function EveningsGrid() {
  return (
    <div className="ev-grid">
      {EVENINGS.map((f, i) => (
        <figure className="ev-fig" key={f.name}>
          <div className="ev-img">
            <Pic
              name={f.name}
              width={f.w}
              height={f.h}
              sizes={i === 0 ? "(max-width: 860px) calc(100vw - 40px), 34vw" : "(max-width: 860px) calc(50vw - 30px), 26vw"}
              alt={f.alt}
            />
          </div>
          <figcaption>{f.cap}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function AboutStill() {
  return (
    <div className="portrait">
      <Pic
        name="about-tools"
        width={1440}
        height={1800}
        sizes="(max-width: 860px) calc(100vw - 40px), 42vw"
        alt="Bar tools on cream linen in daylight: a jigger, a strainer, a bar spoon, a knife, a crystal glass, a lemon, an orange and an apron."
      />
    </div>
  );
}
