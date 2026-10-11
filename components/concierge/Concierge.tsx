"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from "react";
import { OPEN_CHAT_EVENT, type OpenChatDetail } from "@/lib/concierge/events";
import type { ConciergeApi, ConciergeDialogProps } from "./ConciergeDialog";

/** Elements that open the concierge: hovering or focusing one starts the download. */
export const TRIGGER_SELECTOR = "[data-concierge-trigger]";

type DialogModule = typeof import("./ConciergeDialog");
let chunk: Promise<DialogModule> | null = null;

/** Starts (or reuses) the download of the dialog's chunk. A failed load can be retried. */
export function preloadConcierge(): Promise<DialogModule> {
  chunk ??= import("./ConciergeDialog").catch((e: unknown) => {
    chunk = null;
    throw e;
  });
  return chunk;
}

/**
 * The concierge host, in the initial bundle: the desktop launcher and the
 * one `garnish:open-chat` listener, a few hundred bytes. The dialog itself
 * (with its grounding and client code) is a separate chunk, preloaded when
 * the browser is idle after load, or as soon as a trigger is hovered or
 * focused.
 *
 * An open that arrives before the chunk has loaded is not lost: it is held,
 * the trigger shows it is working (aria-busy plus a progress cursor and a
 * dimmed state), and the dialog opens as soon as it mounts, with focus
 * landing in it and returning to that trigger on close, as before.
 */
export default function Concierge() {
  const dialogId = `${useId()}-dlg`;
  const [Dialog, setDialog] = useState<ComponentType<ConciergeDialogProps> | null>(null);
  const [open, setOpen] = useState(false);
  const api = useRef<ConciergeApi | null>(null);
  const pending = useRef<OpenChatDetail | null>(null);
  const busyEl = useRef<HTMLElement | null>(null);

  const setBusy = useCallback((el: HTMLElement | null) => {
    const prev = busyEl.current;
    if (prev && prev !== el) {
      prev.removeAttribute("aria-busy");
      delete prev.dataset.loading;
    }
    busyEl.current = el;
    if (el) {
      el.setAttribute("aria-busy", "true");
      el.dataset.loading = "";
    }
  }, []);

  const load = useCallback(() => {
    preloadConcierge().then(
      (m) => setDialog(() => m.default),
      () => {
        // offline or a failed deploy fetch: drop the held open, let a new tap retry
        pending.current = null;
        setBusy(null);
      },
    );
  }, [setBusy]);

  const request = useCallback(
    (detail: OpenChatDetail) => {
      if (api.current) return api.current.show(detail);
      // keep the opener now: focus may move while the chunk loads
      const active = document.activeElement;
      const opener = detail.opener ?? (active instanceof HTMLElement && active !== document.body ? active : null);
      pending.current = { ...detail, opener };
      setBusy(opener);
      load();
    },
    [load, setBusy],
  );

  const onReady = useCallback(
    (a: ConciergeApi) => {
      api.current = a;
      const held = pending.current;
      pending.current = null;
      setBusy(null);
      if (held) a.show(held);
    },
    [setBusy],
  );

  // the one listener for every surface (bar Ask, /book card, launcher, other code)
  useEffect(() => {
    const onOpen = (e: Event) => request((e as CustomEvent<OpenChatDetail | null>).detail ?? {});
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [request]);

  // preload: on intent (hover, touch start, focus on a trigger) and when idle after load
  useEffect(() => {
    if (Dialog) return;
    const onIntent = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(TRIGGER_SELECTOR)) load();
    };
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);

    let idle = 0;
    let timer = 0;
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(load, { timeout: 4000 });
      else timer = window.setTimeout(load, 2000);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    return () => {
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      window.removeEventListener("load", whenIdle);
      if (idle) window.cancelIdleCallback?.(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, [Dialog, load]);

  return (
    <>
      <button
        type="button"
        className="chat-launcher cc-launch"
        data-concierge-trigger=""
        aria-haspopup="dialog"
        aria-controls={Dialog ? dialogId : undefined}
        aria-expanded={open}
        onClick={(e) => request({ opener: e.currentTarget, surface: "desktop_tab" })}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 5.75C5 4.78 5.78 4 6.75 4h10.5C18.22 4 19 4.78 19 5.75v7.5c0 .97-.78 1.75-1.75 1.75H11l-4.5 4v-4H6.75C5.78 15 5 14.22 5 13.25v-7.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <span>Ask</span>
        <span className="sr-only"> the AI concierge</span>
      </button>
      {Dialog && <Dialog id={dialogId} onReady={onReady} onOpenChange={setOpen} />}
    </>
  );
}
