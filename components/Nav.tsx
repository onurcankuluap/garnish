"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks: { label: string; href: string }[] = [];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-transparent py-2"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">

        {/* ── Wordmark ── */}
        <Link href="/" className="flex flex-col leading-none group">
          <span className="font-cormorant text-[22px] font-semibold tracking-[0.18em] text-foreground uppercase flex items-center gap-2">
            <span className="text-gold text-base leading-none">✦</span>
            Garnish
          </span>
          <span className="font-inter text-[9px] tracking-[0.28em] uppercase text-[var(--muted-light)] mt-0.5 ml-5">
            Private Bartending
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="link-hover font-inter text-xs tracking-[0.18em] uppercase text-[var(--muted-light)] hover:text-foreground transition-colors duration-200"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="ml-4 px-6 py-2.5 border border-gold text-gold font-inter text-xs font-semibold tracking-[0.18em] uppercase hover:bg-gold hover:text-[#0a0a0a] transition-all duration-200"
          >
            Book an Event
          </Link>
        </nav>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {[false, true, false].map((isMiddle, i) => (
            <span
              key={i}
              className={`block h-px bg-foreground transition-all duration-300 ${
                isMiddle
                  ? open ? "opacity-0 w-5" : "w-5"
                  : open
                    ? i === 0 ? "w-5 translate-y-[7px] rotate-45" : "w-5 -translate-y-[7px] -rotate-45"
                    : "w-5"
              }`}
            />
          ))}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-64 border-t border-white/6" : "max-h-0"
        } bg-[#0a0a0a]`}
      >
        <div className="px-6 py-6 flex flex-col gap-5">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-inter text-xs tracking-[0.2em] uppercase text-[var(--muted-light)]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="mt-2 px-6 py-3 border border-gold text-gold font-inter text-xs font-semibold tracking-[0.18em] uppercase text-center hover:bg-gold hover:text-[#0a0a0a] transition-all duration-200"
          >
            Book an Event
          </Link>
        </div>
      </div>
    </header>
  );
}
