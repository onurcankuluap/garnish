import { Suspense } from "react";
import ContactForm from "@/components/ContactForm";
import { phone } from "@/lib/content/facts";
import Pic from "@/components/ui/Pic";

export const metadata = {
  title: "Book a Private Bartender — Inquire",
  description:
    "Hire a private bartender for your wedding, party, or corporate event. Submit an inquiry and Onur will call you back within 24 hours.",
  alternates: {
    canonical: "https://www.garnish.info/contact",
  },
  openGraph: {
    title: "Book a Private Bartender | Garnish",
    description:
      "Hire a private bartender for your next event, based in Rehoboth Beach, DE. The inquiry takes two minutes.",
    url: "https://www.garnish.info/contact",
  },
};

export default function ContactPage() {
  return (
    <main id="main" className="min-h-screen pt-[72px]">
      <div className="max-w-7xl mx-auto px-6 md:px-16 grid md:grid-cols-[1fr_1.4fr] gap-0 min-h-[calc(100vh-72px)]">

        {/* ── Left panel ── */}
        <aside className="py-8 md:py-24 md:pr-16 md:border-r border-white/6 flex flex-col md:justify-between">
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
              <p className="font-inter text-[11px] tracking-[0.25em] uppercase text-[var(--muted-light)] mb-3">
                Prefer to call?
              </p>
              <a
                href={`tel:${phone.tel}`}
                className="group inline-flex items-center gap-3 min-h-[44px] font-inter text-sm text-foreground hover:text-gold transition-colors duration-200"
              >
                <span aria-hidden="true" className="w-8 h-px bg-gold flex-shrink-0 group-hover:w-12 transition-all duration-300" />
                Call Now
              </a>
            </div>
          </div>

          {/* A quiet still: a short band above the heading on phones, under the call link on desktop */}
          <div className="pg-art order-first md:order-none aspect-[3/1] md:aspect-[4/5] w-full md:max-w-[340px] mb-6 md:mb-0 md:mt-16">
            <Pic
              name="contact-highball-d"
              mobile="contact-highball-m"
              mq="(max-width: 767px)"
              width={1440}
              height={1800}
              sizes="340px"
              mobileSizes="calc(100vw - 48px)"
              eager
              alt="A gin and tonic in a tall glass over ice, a cucumber ribbon spiralling inside and a sprig with juniper berries on top, on a slate tray."
            />
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
