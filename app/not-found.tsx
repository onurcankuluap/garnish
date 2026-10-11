import type { Metadata } from "next";
import Link from "next/link";

// Next.js already sends a 404 status and injects <meta name="robots" content="noindex">.
export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen flex flex-col items-start justify-center px-6 md:px-16 pt-[72px]">
      <div className="max-w-7xl mx-auto w-full">
        <p className="font-inter text-[11px] tracking-[0.35em] uppercase text-gold mb-6">404</p>
        <h1 className="font-cormorant text-4xl md:text-6xl font-semibold text-foreground leading-tight mb-6">
          This page isn&rsquo;t on the menu.
        </h1>
        <p className="font-inter text-sm text-[var(--muted-light)] leading-[1.8] max-w-md mb-10">
          The link may be old or mistyped.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 min-h-[48px] bg-gold text-[#0a0a0a] font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b05f] transition-colors"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 min-h-[48px] border border-white/20 text-foreground font-inter text-xs font-semibold tracking-[0.2em] uppercase hover:border-gold hover:text-gold transition-colors"
          >
            Book an Event
          </Link>
        </div>
      </div>
    </main>
  );
}
