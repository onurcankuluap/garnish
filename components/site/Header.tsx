"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Logo, { Coupe } from "./Logo";
import { NAV, BOOK_HREF } from "@/lib/content/site";
import { phone } from "@/lib/content/facts";

/**
 * The header. On the home page it starts transparent over the hero and turns
 * to solid ink once the stage has begun (desktop: 26% into the pin; phones:
 * as the card covers the hero). Everywhere else it is solid from the start.
 * Phones get a "Menu" button that opens a modal <dialog>: the browser
 * provides the focus trap, Esc and the inert page behind it.
 */
export default function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const [solid, setSolid] = useState(!home);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!home) return;
    const mq = matchMedia("(max-width: 860px)");
    const rm = !document.documentElement.classList.contains("js-motion");
    const onScroll = () => {
      if (rm) return setSolid(true);
      setSolid(window.scrollY > innerHeight * (mq.matches ? 0.92 : 0.26));
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [home]);

  // a new page closes the menu
  useEffect(() => {
    if (dialog.current?.open) dialog.current.close();
  }, [pathname]);

  function open() {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    document.documentElement.classList.add("menu-open");
  }
  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <header className={`hd${home && !solid ? "" : " solid"}`} id="hd">
        <Logo />
        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}>
              {item.n && <span className="n">{item.n}</span>}
              {item.label}
            </a>
          ))}
        </nav>
        <a className="call num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="header">
          Call {phone.short}
        </a>
        <a className="btn btn-gold hd-cta" href={BOOK_HREF} data-track="hero_cta" data-track-where="header">
          Check your date <span className="ar" aria-hidden="true" />
        </a>
        <button ref={opener} className="menu" type="button" aria-haspopup="dialog" aria-controls="menu-dialog" onClick={open}>
          Menu <i aria-hidden="true" />
        </button>
      </header>

      <dialog
        ref={dialog}
        id="menu-dialog"
        className="mdlg"
        aria-label="Menu"
        onClose={() => {
          document.documentElement.classList.remove("menu-open");
          opener.current?.focus();
        }}
        onClick={(e) => {
          // a link inside closes the menu (the page then scrolls or navigates)
          if ((e.target as HTMLElement).closest("a")) close();
        }}
      >
        <div className="mtop">
          <span className="logo" aria-hidden="true">
            <Coupe width={24} height={31} />
            <span className="wm">
              <b>Garnish</b>
            </span>
          </span>
          <button className="mclose" type="button" onClick={close} autoFocus>
            Close <i aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Menu">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}>
              <em>{item.n}</em>
              {"long" in item ? item.long : item.label}
            </a>
          ))}
        </nav>
        <div className="mfoot">
          <a className="btn btn-gold" href={BOOK_HREF} data-track="hero_cta" data-track-where="menu">
            Check your date <span className="ar" aria-hidden="true" />
          </a>
          <a className="tlink num" href={`tel:${phone.tel}`} data-track="call_click" data-track-where="menu">
            or call {phone.display}
          </a>
        </div>
      </dialog>
    </>
  );
}
