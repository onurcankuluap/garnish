import Link from "next/link";
import HeroVideo from "@/components/HeroVideo";
import GarnishLogo from "@/components/GarnishLogo";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";

/* ─── Data ─────────────────────────────────────────────────────── */


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
      {/* Hidden H1 for crawlers — visible heading is in the hero below */}
      <h1 className="sr-only">
        Private Bartender for Hire — Rehoboth Beach, Delaware | Garnish
      </h1>

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
              Now Booking 2026
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
                className="group w-full sm:w-auto justify-center inline-flex items-center gap-3 px-8 min-h-[48px] bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] active:bg-[#b8923e] transition-colors duration-200 touch-manipulation"
              >
                Book an Event
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <a
                href={`tel:${phone}`}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-3 px-8 min-h-[48px] border border-white/15 text-foreground font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:border-gold hover:text-gold active:text-gold transition-all duration-200 touch-manipulation"
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
      <div className="border-y border-white/6 py-5 marquee-outer">
        <div className="marquee-track flex whitespace-nowrap items-center">
          {marquee.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-8 px-8">
              <span className="font-inter text-[11px] tracking-[0.28em] uppercase text-[var(--muted)]">
                {item}
              </span>
              {/* Mini coupe glass separator */}
              <svg width="13" height="18" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="opacity-60 flex-shrink-0">
                <path d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z" stroke="#c9a84c" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(201,168,76,0.08)"/>
                <line x1="16" y1="28" x2="16" y2="36" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="9" y1="36" x2="23" y2="36" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="27" cy="6.5" r="3.8" stroke="#c9a84c" strokeWidth="1" fill="none"/>
                <line x1="27" y1="2.7" x2="27" y2="10.3" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round"/>
              </svg>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section className="px-6 md:px-16 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-px bg-gold" />
              <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">Pricing</span>
            </div>
            <h2
              className="font-cormorant font-semibold text-foreground leading-[1.0] mb-5"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
            >
              Built around<br />
              <em className="not-italic text-gold">your event.</em>
            </h2>
            <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] max-w-lg">
              Every event is different — here&apos;s a starting point. Reach out for a custom quote tailored to your guest count and occasion.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* Basic */}
            <div className="group relative bg-[#141414] border border-white/8 p-8 md:hover:-translate-y-1 transition-transform duration-300">
              <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)] mb-6">Basic</p>
              <div className="mb-1">
                <span className="font-cormorant text-4xl font-semibold text-foreground">Starting at $75</span>
                <span className="font-inter text-xs text-[var(--muted)] ml-1">/hr</span>
              </div>
              <p className="font-inter text-[11px] text-[var(--muted)] leading-[1.7] mb-8">
                + additional hourly rate for parties over 50 guests
              </p>
              <div className="h-px bg-white/6 mb-8" />
              <ul className="space-y-4 mb-10">
                {[
                  "Professional bartender for your event",
                  "Hourly flat-rate service",
                  "Standard bar setup",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-inter text-sm text-[var(--muted-light)] leading-[1.6]">
                    <span className="text-gold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact?plan=Basic"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 min-h-[48px] border border-white/15 font-inter text-xs font-semibold tracking-[0.18em] uppercase text-foreground hover:border-gold hover:text-gold active:border-gold active:text-gold transition-all duration-200 touch-manipulation"
              >
                Book Now →
              </Link>
            </div>

            {/* Standard — featured */}
            <div className="group relative bg-[#141414] border border-gold/60 p-8 md:scale-[1.03] md:-translate-y-2 md:hover:-translate-y-3 transition-transform duration-300 shadow-[0_0_40px_rgba(201,168,76,0.08)]">
              <div className="flex items-center justify-between mb-6">
                <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)]">Standard</p>
                <span className="font-inter text-[8px] tracking-[0.2em] uppercase text-[#0a0a0a] bg-gold px-2.5 py-1">Most Popular</span>
              </div>
              <div className="mb-1">
                <span className="font-cormorant text-4xl font-semibold text-foreground">Starting at $110</span>
                <span className="font-inter text-xs text-[var(--muted)] ml-1">/hr</span>
              </div>
              <p className="font-inter text-[11px] text-[var(--muted)] leading-[1.7] mb-8">
                Everything in Basic, plus custom cocktail planning
              </p>
              <div className="h-px bg-white/6 mb-8" />
              <ul className="space-y-4 mb-10">
                {[
                  "Everything in Basic",
                  "2 custom cocktails designed around your taste",
                  "Dietary restrictions & allergies accommodated",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-inter text-sm text-[var(--muted-light)] leading-[1.6]">
                    <span className="text-gold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact?plan=Standard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 min-h-[48px] bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.18em] uppercase hover:bg-[#d4b05f] active:bg-[#b8923e] transition-colors duration-200 touch-manipulation"
              >
                Book Now →
              </Link>
            </div>

            {/* Bartender + DJ */}
            <div className="group relative bg-[#141414] border border-white/8 p-8 md:hover:-translate-y-1 transition-transform duration-300">
              <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)] mb-6">Bartender + DJ</p>
              <div className="mb-1">
                <span className="font-cormorant text-4xl font-semibold text-foreground">Starting at $160</span>
                <span className="font-inter text-xs text-[var(--muted)] ml-1">/hr</span>
              </div>
              <p className="font-inter text-[11px] text-[var(--muted)] leading-[1.7] mb-8">
                The full experience
              </p>
              <div className="h-px bg-white/6 mb-8" />
              <ul className="space-y-4 mb-10">
                {[
                  "Everything in Standard",
                  "Personalized cocktail menu creation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-inter text-sm text-[var(--muted-light)] leading-[1.6]">
                    <span className="text-gold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact?plan=Bartender+DJ"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 min-h-[48px] border border-white/15 font-inter text-xs font-semibold tracking-[0.18em] uppercase text-foreground hover:border-gold hover:text-gold active:border-gold active:text-gold transition-all duration-200 touch-manipulation"
              >
                Book Now →
              </Link>
            </div>

          </div>

          {/* Footer note */}
          <div className="mt-14 pt-10 border-t border-white/6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="font-inter text-xs text-[var(--muted)] leading-[1.8] max-w-xl">
              Final pricing depends on guest count, event length, location, and specific requests. Fill out the contact form or call directly for an accurate quote.
            </p>
            <Link
              href="/contact"
              className="flex-shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 min-h-[48px] border border-gold/40 font-inter text-xs font-semibold tracking-[0.18em] uppercase text-gold hover:border-gold hover:bg-gold/5 active:bg-gold/10 transition-all duration-200 touch-manipulation"
            >
              Get a Custom Quote →
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROCESS
      ══════════════════════════════════════════ */}
      <section id="process" className="py-28 px-6 md:px-16 bg-[#0d0d0d] border-t border-white/6">
        <div className="max-w-7xl mx-auto">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-20">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-8 h-px bg-gold" />
                <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
                  How It Works
                </span>
              </div>
              <h2
                className="font-cormorant font-semibold text-foreground leading-[1.0]"
                style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
              >
                Three steps to<br />
                <em className="not-italic text-gold">an unforgettable bar.</em>
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/6">
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
              <div key={step.n} className="py-10 md:py-0 md:px-12 first:md:pl-0 last:md:pr-0 group">
                <span className="font-inter text-[10px] tracking-[0.2em] text-gold border border-gold/25 w-9 h-9 inline-flex items-center justify-center mb-7 group-hover:border-gold/60 transition-colors duration-300">
                  {step.n}
                </span>
                <h3 className="font-cormorant text-2xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.9]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t border-white/6 px-6 md:px-16 pt-14 pb-28 md:pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between gap-10 mb-14">
            <div>
              <div className="mb-4">
                <GarnishLogo scale={0.9} />
              </div>
              <p className="font-inter text-xs text-[var(--muted)] leading-[1.8] max-w-[220px]">
                Bespoke cocktail service for private events — crafted with care, served with intention.
              </p>
              <div className="mt-8">
                <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)] mb-4">
                  Get in Touch
                </p>
                <a
                  href={`tel:${phone}`}
                  className="inline-block py-2 font-inter text-xs text-[var(--muted-light)] hover:text-gold transition-colors touch-manipulation"
                >
                  Call Now →
                </a>
                <div className="mt-2">
                  <Link
                    href="/contact"
                    className="inline-block py-2 font-inter text-xs text-gold hover:text-[#d4b05f] transition-colors touch-manipulation"
                  >
                    Submit an Inquiry →
                  </Link>
                </div>
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
