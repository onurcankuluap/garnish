import { Suspense } from "react";
import ContactForm from "@/components/ContactForm";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";

export const metadata = {
  title: "Book a Private Bartender — Inquire",
  description:
    "Hire a private bartender for your wedding, party, or corporate event in Delaware, Philadelphia, or DC. Submit an inquiry and Onur will call you back within 24 hours.",
  alternates: {
    canonical: "https://www.garnish.info/contact",
  },
  openGraph: {
    title: "Book a Private Bartender | Garnish",
    description:
      "Hire a private bartender for your next event. Serving Rehoboth Beach DE, Philadelphia & DC. Inquiry takes 2 minutes.",
    url: "https://www.garnish.info/contact",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-[72px]">
      <div className="max-w-7xl mx-auto px-6 md:px-16 grid md:grid-cols-[1fr_1.4fr] gap-0 min-h-[calc(100vh-72px)]">

        {/* ── Left panel ── */}
        <aside className="py-8 md:py-24 md:pr-16 md:border-r border-white/6 flex flex-col justify-between">
          <div>
            {/* Label */}
            <div className="flex items-center gap-4 mb-6 md:mb-10">
              <div className="w-8 h-px bg-gold" />
              <span className="font-inter text-[10px] tracking-[0.35em] uppercase text-gold">
                Inquire
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-cormorant text-3xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-[0.95] mb-5 md:mb-8">
              Let&rsquo;s plan<br />
              your event<br />
              <em className="not-italic text-gold">together.</em>
            </h1>

            <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] max-w-sm mb-6 md:mb-10">
              Fill in the form and I&rsquo;ll be in touch within 24 hours to discuss every detail personally.
            </p>

            {/* Prefer to call */}
            <div className="border-t border-white/8 pt-6 md:pt-8">
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
          <div className="hidden md:block mt-16 opacity-20">
            <svg width="28" height="36" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z" stroke="#c9a84c" strokeWidth="1" strokeLinejoin="round" fill="rgba(201,168,76,0.05)"/>
              <line x1="16" y1="28" x2="16" y2="36" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
              <line x1="9" y1="36" x2="23" y2="36" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
              <circle cx="27" cy="6.5" r="3.8" stroke="#c9a84c" strokeWidth="0.7" fill="none"/>
              <line x1="27" y1="2.7" x2="27" y2="10.3" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round"/>
              <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round"/>
              <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round"/>
            </svg>
          </div>
        </aside>

        {/* ── Right panel (form) ── */}
        <div className="py-2 md:py-24 md:pl-16">
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>

      </div>
    </main>
  );
}
