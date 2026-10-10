"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { phone } from "@/lib/content/facts";
import { BOOK_HREF } from "@/lib/content/site";
import { track } from "@/lib/analytics";

/** Opens the AI concierge (components/GarnishChat listens for this event). */
export const OPEN_CHAT_EVENT = "garnish:open-chat";

const isField = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLInputElement && !/^(button|submit|checkbox|radio|range|reset|hidden)$/.test(el.type)) ||
    (el as HTMLElement).isContentEditable);

/**
 * The phones' sticky action bar: Ask · Call · Check your date (dominant).
 * - The page reserves its height plus the safe-area inset (body padding in
 *   lit.css), so it never covers the end of the page.
 * - It steps aside while a text field has focus or the on-screen keyboard
 *   shrinks the viewport, and while the menu dialog is open.
 * - It is absent on /book, where the booking flow has its own controls.
 * Also hosts the click delegation for data-track analytics hooks.
 */
export default function MobileBar() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      const vv = window.visualViewport;
      const keyboard = vv ? vv.height < innerHeight * 0.72 : false;
      html.classList.toggle("kb", keyboard || isField(document.activeElement));
    };
    const onFocusOut = () => setTimeout(sync, 0);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const ev = el.dataset.track as Parameters<typeof track>[0];
      track(ev, { where: el.dataset.trackWhere });
    };
    addEventListener("focusin", sync);
    addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", sync);
    document.addEventListener("click", onClick);
    return () => {
      removeEventListener("focusin", sync);
      removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", sync);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (pathname === "/book") return null;

  return (
    <nav className="mbar" aria-label="Quick actions">
      <button
        type="button"
        className="ask"
        aria-label="Ask the AI concierge"
        onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
      >
        Ask
      </button>
      <a className="callb" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="bar">
        Call
      </a>
      <a className="go" href={BOOK_HREF} data-track="hero_cta" data-track-where="bar">
        Check your date
      </a>
    </nav>
  );
}
