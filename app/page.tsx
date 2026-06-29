import Link from "next/link";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";

/* ─── Data ─────────────────────────────────────────────────────── */

const services = [
  {
    n: "01",
    title: "Weddings",
    desc: "A wedding bar should feel effortless. I handle everything — from the welcome toast to the last nightcap — so you stay present for every moment.",
  },
  {
    n: "02",
    title: "Private Parties",
    desc: "Craft cocktails, personalised menus, and a presence that elevates the room. For gatherings where the details matter.",
  },
  {
    n: "03",
    title: "Corporate Events",
    desc: "First impressions last. I bring polished, professional bar service that reflects your brand and leaves guests talking.",
  },
];

const steps = [
  {
    n: "01",
    title: "Tell me about your event",
    desc: "A two-minute form — date, guest count, and the vibe you're going for. Nothing more.",
  },
  {
    n: "02",
    title: "We talk through the details",
    desc: "I call you back personally within 24 hours. We'll discuss drinks, timing, setup — everything.",
  },
  {
    n: "03",
    title: "I take care of the rest",
    desc: "I arrive early, set up beautifully, and deliver an experience your guests will remember.",
  },
];

/* ─── Page ─────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="overflow-x-hidden">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-end px-6 md:px-16 pb-16 md:pb-20 pt-32">

        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_30%_55%,rgba(201,168,76,0.07)_0%,transparent_70%)] pointer-events-none" />

        {/* Vertical accent — desktop only */}
        <div className="hidden md:block absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#c9a84c]/20 to-transparent pointer-events-none" />

        {/* Large ghost year — decorative */}
        <span className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2 font-cormorant text-[220px] font-semibold leading-none text-white/[0.025] select-none pointer-events-none">
          BAR
        </span>

        <div className="relative z-10 max-w-7xl mx-auto w-full">

          {/* Eyebrow */}
          <div className="anim-fade-up flex items-center gap-4 mb-10">
            <div className="w-10 h-px bg-gold" />
            <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
              Exclusively Private
            </span>
          </div>

          {/* Headline */}
          <h1 className="anim-fade-up-1 font-cormorant font-semibold leading-[0.88] tracking-[-0.01em] text-foreground mb-10"
              style={{ fontSize: "clamp(3.2rem, 10vw, 9rem)" }}>
            The Art of<br />
            <em className="not-italic text-gold">Private</em><br />
            Bartending.
          </h1>

          {/* Bottom row: subtext + CTAs */}
          <div className="anim-fade-up-2 flex flex-col md:flex-row md:items-end gap-8 md:gap-20">
            <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] max-w-xs">
              Bespoke cocktail experiences for discerning hosts. Every event crafted with precision, poured with intention.
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
          SERVICES
      ══════════════════════════════════════════ */}
      <section id="services" className="py-28 px-6 md:px-16">
        <div className="max-w-7xl mx-auto">

          {/* Section label */}
          <div className="flex items-center gap-6 mb-20">
            <div className="w-8 h-px bg-gold" />
            <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
              What I Offer
            </span>
          </div>

          {/* Pull quote */}
          <p className="font-cormorant text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground/80 italic leading-tight max-w-3xl mb-20">
            &ldquo;Every detail considered.<br />Every guest remembered.&rdquo;
          </p>

          {/* Service list */}
          <div className="divide-y divide-white/8">
            {services.map((s) => (
              <div
                key={s.n}
                className="group py-10 grid md:grid-cols-[80px_1fr_2fr] gap-4 md:gap-10 items-start hover:pl-2 transition-all duration-300"
              >
                <span className="font-inter text-[10px] tracking-[0.2em] text-[var(--muted)] pt-1">
                  {s.n}
                </span>
                <h3 className="font-cormorant text-2xl md:text-3xl font-semibold text-foreground group-hover:text-gold transition-colors duration-300">
                  {s.title}
                </h3>
                <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROCESS
      ══════════════════════════════════════════ */}
      <section id="process" className="py-28 px-6 md:px-16 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">

          {/* Section label */}
          <div className="flex items-center gap-6 mb-20">
            <div className="w-8 h-px bg-gold" />
            <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
              How It Works
            </span>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-0">
            {steps.map((step, i) => (
              <div key={step.n} className="relative group">
                {/* Connector line between steps */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-[18px] left-[calc(50%+24px)] right-0 h-px bg-gradient-to-r from-gold/30 to-transparent" />
                )}

                <div className="pr-0 md:pr-12 pb-12 md:pb-0">
                  {/* Number + line */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-inter text-[10px] tracking-[0.2em] text-gold border border-gold/30 w-9 h-9 flex items-center justify-center flex-shrink-0">
                      {step.n}
                    </span>
                    <div className="flex-1 h-px bg-white/8 md:hidden" />
                  </div>

                  <h3 className="font-cormorant text-xl md:text-2xl font-semibold text-foreground mb-3 leading-snug">
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
            <h2 className="font-cormorant text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-tight">
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

          {/* Top row */}
          <div className="grid md:grid-cols-3 gap-10 mb-14">
            {/* Brand */}
            <div>
              <div className="flex flex-col leading-none mb-4">
                <span className="font-cormorant text-2xl font-semibold tracking-[0.18em] uppercase flex items-center gap-2">
                  <span className="text-gold text-base">✦</span>
                  Garnish
                </span>
                <span className="font-inter text-[9px] tracking-[0.28em] uppercase text-[var(--muted)] mt-1 ml-5">
                  Private Bartending
                </span>
              </div>
              <p className="font-inter text-xs text-[var(--muted)] leading-[1.8] max-w-[220px]">
                Bespoke cocktail service for private events — crafted with care, served with style.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-[var(--muted)] mb-5">
                Navigation
              </p>
              <ul className="space-y-3">
                {[
                  { label: "Services",   href: "/#services" },
                  { label: "Process",    href: "/#process"  },
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

            {/* Contact */}
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

          {/* Bottom row */}
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
