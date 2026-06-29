import ContactForm from "@/components/ContactForm";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";

export const metadata = {
  title: "Book an Event — Garnish",
  description: "Submit an inquiry and I'll call you back within 24 hours.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-[72px]">
      <div className="max-w-7xl mx-auto px-6 md:px-16 grid md:grid-cols-[1fr_1.4fr] gap-0 min-h-[calc(100vh-72px)]">

        {/* ── Left panel ── */}
        <aside className="py-16 md:py-24 md:pr-16 md:border-r border-white/6 flex flex-col justify-between">
          <div>
            {/* Label */}
            <div className="flex items-center gap-4 mb-10">
              <div className="w-8 h-px bg-gold" />
              <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
                Inquire
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-cormorant text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-[0.95] mb-8">
              Let&rsquo;s plan<br />
              your event<br />
              <em className="not-italic text-gold">together.</em>
            </h1>

            <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] max-w-sm mb-10">
              Fill in the form and I&rsquo;ll be in touch within 24 hours to discuss every detail personally.
            </p>

            {/* Prefer to call */}
            <div className="border-t border-white/8 pt-8">
              <p className="font-inter text-[10px] tracking-[0.25em] uppercase text-[var(--muted)] mb-3">
                Prefer to call?
              </p>
              <a
                href={`tel:${phone}`}
                className="group inline-flex items-center gap-3 font-inter text-sm text-foreground hover:text-gold transition-colors duration-200"
              >
                <span className="w-8 h-px bg-gold flex-shrink-0 group-hover:w-12 transition-all duration-300" />
                Call Now
              </a>
            </div>
          </div>

          {/* Bottom ornament */}
          <div className="hidden md:flex items-center gap-3 mt-16 opacity-20">
            <span className="font-cormorant text-6xl text-gold font-semibold leading-none">✦</span>
          </div>
        </aside>

        {/* ── Right panel (form) ── */}
        <div className="py-16 md:py-24 md:pl-16">
          <ContactForm />
        </div>

      </div>
    </main>
  );
}
