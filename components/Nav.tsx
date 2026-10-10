"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import GarnishLogo from "@/components/GarnishLogo";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Esc closes the mobile menu and returns focus to its button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 py-2 transition-[background-color,border-color] duration-300 ${
        scrolled ? "bg-[#0a0a0a]/85 backdrop-blur-md border-b border-white/6" : "bg-transparent"
      }`}
    >
      <nav aria-label="Main" className="max-w-7xl mx-auto px-6 md:px-10 h-[72px] flex items-center justify-between">
        <GarnishLogo scale={1} />

        {/* Desktop: the one action the site offers */}
        <Link
          href="/contact"
          className="hidden md:inline-flex items-center min-h-[44px] font-inter text-xs tracking-[0.2em] uppercase text-[var(--muted-light)] hover:text-gold transition-colors"
        >
          Book an Event
        </Link>

        {/* Mobile: disclosure button */}
        <button
          ref={toggleRef}
          type="button"
          className="md:hidden flex flex-col justify-center gap-[5px] min-w-[44px] min-h-[44px] items-center touch-manipulation"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`block h-px w-5 bg-foreground transition-all duration-300 motion-reduce:transition-none ${
                i === 1
                  ? open
                    ? "opacity-0"
                    : ""
                  : open
                    ? i === 0
                      ? "translate-y-[6px] rotate-45"
                      : "-translate-y-[6px] -rotate-45"
                    : ""
              }`}
            />
          ))}
        </button>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="md:hidden border-t border-white/6 bg-[#0a0a0a]"
      >
        <ul className="px-6 py-6 flex flex-col gap-5">
          <li>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="inline-flex items-center min-h-[44px] font-inter text-xs tracking-[0.2em] uppercase text-[var(--muted-light)] touch-manipulation"
            >
              Book an Event
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
