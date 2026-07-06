"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import GarnishLogo from "@/components/GarnishLogo";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 py-2 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a0a]/85 backdrop-blur-md border-b border-white/6"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">

        {/* ── Wordmark ── */}
        <GarnishLogo scale={1} />

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden flex flex-col justify-center gap-[5px] min-w-[44px] min-h-[44px] items-center touch-manipulation"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
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
          <Link
            href="/contact"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
            className="inline-block py-2 font-inter text-xs tracking-[0.2em] uppercase text-[var(--muted-light)] touch-manipulation"
          >
            Book an Event
          </Link>
        </div>
      </div>
    </header>
  );
}
