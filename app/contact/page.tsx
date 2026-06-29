import ContactForm from "@/components/ContactForm";

const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "YOUR_PHONE_NUMBER";

export const metadata = {
  title: "Book an Event — Garnish",
  description: "Submit an inquiry and I'll call you back within 24 hours.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="font-inter text-xs tracking-[0.3em] uppercase text-gold mb-3">
            Get in Touch
          </p>
          <h1 className="font-cormorant text-4xl md:text-5xl font-semibold text-foreground mb-4">
            Book an Event
          </h1>
          <p className="font-inter text-sm text-muted leading-relaxed mb-6">
            Fill out the form below and I&apos;ll be in touch within 24 hours.
          </p>
          <p className="font-inter text-sm text-foreground/70">
            Prefer to call directly?{" "}
            <a
              href={`tel:${phone}`}
              className="text-gold hover:text-[#d4b05f] transition-colors font-medium"
            >
              {phone}
            </a>
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 mb-12" />

        <ContactForm />
      </div>
    </main>
  );
}
