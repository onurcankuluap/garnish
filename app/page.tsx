import Link from "next/link";
import HeroVideo from "@/components/HeroVideo";
import GarnishLogo from "@/components/GarnishLogo";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";

/* ─── Data ─────────────────────────────────────────────────────── */

const services = [
  {
    n: "01",
    title: "Weddings",
    desc: "Your wedding bar should feel effortless. I handle every pour — from the welcome toast to the last nightcap — so you stay present for every moment that matters.",
  },
  {
    n: "02",
    title: "Private Parties",
    desc: "Each menu is written for the room. Composed cocktails, seasonal ingredients, and a presence that makes the gathering feel considered.",
  },
  {
    n: "03",
    title: "Corporate Events",
    desc: "The bar is often the first thing guests remember. I make sure what they remember is worth talking about.",
  },
];

const marqueeItems = [
  "Craft Cocktails",
  "Weddings",
  "Private Parties",
  "Corporate Events",
  "Dinner Parties",
  "Seasonal Menus",
  "Birthdays",
  "Bespoke Service",
];

/* ─── Page ─────────────────────────────────────────────────────── */

export default function Home() {
  const marquee = [...marqueeItems, ...marqueeItems]; // doubled for seamless loop

  return (
    <main className="overflow-x-hidden">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-end px-6 md:px-16 pb-16 md:pb-20 pt-32">

        <HeroVideo />
        <div className="hidden md:block absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#c9a84c]/20 to-transparent pointer-events-none" />
        <span className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2 font-cormorant text-[220px] font-semibold leading-none text-white/[0.022] select-none pointer-events-none">
          BAR
        </span>

        <div className="relative z-10 max-w-7xl mx-auto w-full">

          {/* Eyebrow */}
          <div className="anim-fade-up flex items-center gap-4 mb-10">
            <div className="w-10 h-px bg-gold" />
            <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
              Private Bartending
            </span>
            {/* Booking badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 border border-gold/30 px-3 py-1 font-inter text-[9px] tracking-[0.2em] uppercase text-gold/70 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-pulse" />
              Now Booking 2025
            </span>
          </div>

          {/* Headline */}
          <h1
            className="anim-fade-up-1 font-cormorant font-semibold leading-[0.88] tracking-[-0.01em] text-foreground mb-10"
            style={{ fontSize: "clamp(3.2rem, 10vw, 9rem)" }}
          >
            The Art of<br />
            <em className="not-italic text-gold">Private</em><br />
            Bartending.
          </h1>

          {/* Bottom row */}
          <div className="anim-fade-up-2 flex flex-col md:flex-row md:items-end gap-8 md:gap-20">
            <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] max-w-xs">
              Every glass is a composition. Every event, a performance. Nothing improvised — everything intentional.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 px-8 py-3.5 bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] transition-colors duration-200"
              >
                Book an Event
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-3 px-8 py-3.5 border border-white/15 text-foreground font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:border-gold hover:text-gold transition-all duration-200"
              >
                Call Now
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="anim-fade-in hidden md:flex absolute bottom-10 right-10 flex-col items-center gap-3 opacity-30">
          <span className="font-inter text-[9px] tracking-[0.3em] uppercase [writing-mode:vertical-rl]">
            Scroll
          </span>
          <div className="w-px h-14 bg-foreground/50 scroll-pulse" />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MARQUEE STRIP
      ══════════════════════════════════════════ */}
      <div className="border-y border-white/6 py-4 overflow-hidden">
        <div className="marquee-track flex whitespace-nowrap">
          {marquee.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-6 px-6">
              <span className="font-cormorant text-lg italic text-[var(--muted-light)]">
                {item}
              </span>
              <span className="text-gold text-xs">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SERVICES
      ══════════════════════════════════════════ */}
      <section id="services" className="py-28 px-6 md:px-16 border-t border-white/6">
        <div className="max-w-7xl mx-auto">

          <div className="flex items-center gap-6 mb-20">
            <div className="w-8 h-px bg-gold" />
            <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
              What I Offer
            </span>
          </div>

          <div className="divide-y divide-white/6">
            {services.map((s) => (
              <div
                key={s.n}
                className="group py-10 grid md:grid-cols-[80px_1fr_2fr] gap-4 md:gap-10 items-start hover:pl-3 transition-all duration-500"
              >
                <span className="font-inter text-[10px] tracking-[0.2em] text-[var(--muted)] pt-1">
                  {s.n}
                </span>
                <h3 className="font-cormorant text-2xl md:text-3xl font-semibold text-foreground group-hover:text-gold transition-colors duration-300">
                  {s.title}
                </h3>
                <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.9]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PHILOSOPHY (replaces "How It Works")
      ══════════════════════════════════════════ */}
      <section id="process" className="py-28 px-6 md:px-16 bg-[#0d0d0d] border-t border-white/6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-start">

          {/* Left: manifesto */}
          <div>
            <div className="flex items-center gap-6 mb-12">
              <div className="w-8 h-px bg-gold" />
              <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
                The Craft
              </span>
            </div>

            <h2
              className="font-cormorant font-semibold text-foreground leading-[1.05] mb-10"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              Nothing is left to<br />
              <em className="not-italic text-gold">chance.</em>
            </h2>

            <div className="space-y-6 font-inter text-sm text-[var(--muted-light)] leading-[1.9] max-w-md">
              <p>
                Every menu is composed weeks before your event. Ingredients are sourced seasonally, spirits chosen deliberately, and each cocktail built around the rhythm of the evening — not just a list of drinks.
              </p>
              <p>
                I arrive early. I leave late. Between those hours, I make sure every guest feels like the bar was designed specifically for them.
              </p>
              <p>
                This is not a service. It is a collaboration — between the host, the occasion, and the glass.
              </p>
            </div>
          </div>

          {/* Right: process steps */}
          <div className="space-y-0 divide-y divide-white/6">
            {[
              {
                n: "01",
                title: "Tell me about your event",
                desc: "A short form — date, guests, the feeling you're after. Nothing more than two minutes.",
              },
              {
                n: "02",
                title: "We talk through the details",
                desc: "I call you personally within 24 hours. We discuss drinks, pacing, setup — until it feels right.",
              },
              {
                n: "03",
                title: "I take care of everything",
                desc: "I arrive ahead of schedule, set up without a fuss, and pour every drink like it is the first one of the night.",
              },
            ].map((step) => (
              <div key={step.n} className="py-8 flex gap-8 group">
                <span className="font-inter text-[10px] tracking-[0.2em] text-gold border border-gold/25 w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-gold/60 transition-colors duration-300">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-cormorant text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BAND
      ══════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-16 border-t border-white/6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-10">
          <div>
            <p className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold mb-4">
              Ready to begin?
            </p>
            <h2
              className="font-cormorant font-semibold text-foreground leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}
            >
              Let&rsquo;s make your<br />event unforgettable.
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <Link
              href="/contact"
              className="group inline-flex items-center justify-center gap-3 px-10 py-4 bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] transition-colors duration-200"
            >
              Book an Event
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 border border-white/15 text-foreground font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:border-gold hover:text-gold transition-all duration-200"
            >
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t border-white/6 px-6 md:px-16 pt-14 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-14">
            <div>
              <div className="mb-4">
                <GarnishLogo scale={0.9} />
              </div>
              <p className="font-inter text-xs text-[var(--muted)] leading-[1.8] max-w-[220px]">
                Bespoke cocktail service for private events — crafted with care, served with intention.
              </p>
            </div>

            <div>
              <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)] mb-5">
                Navigation
              </p>
              <ul className="space-y-3">
                {[
                  { label: "Book an Event", href: "/contact" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="link-hover font-inter text-xs text-[var(--muted-light)] hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)] mb-5">
                Get in Touch
              </p>
              <a
                href={`tel:${phone}`}
                className="link-hover font-inter text-xs text-[var(--muted-light)] hover:text-gold transition-colors"
              >
                Call Now →
              </a>
              <div className="mt-4">
                <Link
                  href="/contact"
                  className="font-inter text-xs text-gold hover:text-[#d4b05f] transition-colors"
                >
                  Submit an Inquiry →
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="font-inter text-[10px] text-[var(--muted)]">
              &copy; {new Date().getFullYear()} Garnish. All rights reserved.
            </p>
            <p className="font-inter text-[10px] text-[var(--muted)]">
              Private bartending for discerning hosts.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
