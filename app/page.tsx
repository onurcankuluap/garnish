import Link from "next/link";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "YOUR_PHONE_NUMBER";

const services = [
  {
    title: "Weddings",
    desc: "Elegant, bespoke bar service tailored to make your wedding day unforgettable.",
  },
  {
    title: "Private Parties",
    desc: "Craft cocktails and personalised menus for intimate gatherings and celebrations.",
  },
  {
    title: "Corporate Events",
    desc: "Professional, polished bar service that leaves a lasting impression on your guests.",
  },
];

const steps = [
  {
    n: "01",
    title: "Fill out the form",
    desc: "Tell me about your event — date, guests, vibe. Takes two minutes.",
  },
  {
    n: "02",
    title: "I'll call you back",
    desc: "I personally reach out within 24 hours to discuss every detail.",
  },
  {
    n: "03",
    title: "We make it happen",
    desc: "I arrive, set up, and deliver an experience your guests will talk about.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/95 to-[#0a0a0a] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent to-gold opacity-60" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="animate-fade-in font-inter text-xs tracking-[0.3em] uppercase text-gold mb-6">
            Exclusively Private
          </p>
          <h1 className="animate-fade-in-delay-1 font-cormorant text-5xl md:text-7xl font-semibold leading-tight tracking-wide text-foreground mb-6">
            Private Bartender
            <br />
            <span className="text-gold">Services</span>
          </h1>
          <p className="animate-fade-in-delay-2 font-inter text-base md:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Bespoke cocktail experiences for discerning hosts. From intimate
            dinner parties to grand celebrations — crafted with care, served
            with style.
          </p>
          <div className="animate-fade-in-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-3.5 bg-gold text-[#0a0a0a] font-inter font-semibold text-sm tracking-widest uppercase hover:bg-[#d4b05f] transition-colors"
            >
              Book an Event
            </Link>
            <a
              href={`tel:${phone}`}
              className="px-8 py-3.5 border border-white/20 text-foreground font-inter font-semibold text-sm tracking-widest uppercase hover:border-gold hover:text-gold transition-colors"
            >
              {phone}
            </a>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
      </section>

      {/* Divider */}
      <div className="flex items-center gap-4 max-w-6xl mx-auto px-6">
        <div className="flex-1 h-px bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Services */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-inter text-xs tracking-[0.3em] uppercase text-gold mb-3">
              What I Offer
            </p>
            <h2 className="font-cormorant text-4xl md:text-5xl font-semibold text-foreground">
              Events I Serve
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-card border border-white/8 p-8 hover:border-gold/40 transition-colors duration-300 group"
              >
                <div className="w-8 h-px bg-gold mb-6 group-hover:w-16 transition-all duration-300" />
                <h3 className="font-cormorant text-2xl font-semibold text-foreground mb-3">
                  {s.title}
                </h3>
                <p className="font-inter text-sm text-muted leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-inter text-xs tracking-[0.3em] uppercase text-gold mb-3">
              Simple Process
            </p>
            <h2 className="font-cormorant text-4xl md:text-5xl font-semibold text-foreground">
              How It Works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.n} className="flex flex-col items-start">
                <span className="font-cormorant text-6xl font-semibold text-gold/20 leading-none mb-4">
                  {step.n}
                </span>
                <h3 className="font-cormorant text-2xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="font-inter text-sm text-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <span className="font-cormorant text-xl font-semibold tracking-widest uppercase text-foreground">
            Garnish
          </span>
          <div className="flex items-center gap-6 font-inter text-sm text-muted">
            <a
              href={`tel:${phone}`}
              className="hover:text-gold transition-colors"
            >
              {phone}
            </a>
            <Link href="/contact" className="hover:text-gold transition-colors">
              Book an Event
            </Link>
          </div>
          <p className="font-inter text-xs text-muted">
            &copy; {new Date().getFullYear()} Garnish. All rights
            reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
