"use client";

import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-cormorant text-xl font-semibold tracking-widest text-foreground uppercase"
        >
          Garnish
        </Link>

        {/* Desktop */}
        <Link
          href="/contact"
          className="hidden md:inline-flex items-center px-6 py-2 bg-gold text-[#0a0a0a] font-inter text-sm font-semibold tracking-wider uppercase rounded-none hover:bg-[#d4b05f] transition-colors"
        >
          Book an Event
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-px bg-foreground transition-transform duration-200 ${open ? "translate-y-2.5 rotate-45" : ""}`}
          />
          <span
            className={`block w-6 h-px bg-foreground transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-6 h-px bg-foreground transition-transform duration-200 ${open ? "-translate-y-2.5 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#0a0a0a] border-t border-white/5 px-6 py-4">
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="block w-full text-center px-6 py-3 bg-gold text-[#0a0a0a] font-semibold tracking-wider uppercase text-sm"
          >
            Book an Event
          </Link>
        </div>
      )}
    </header>
  );
}
