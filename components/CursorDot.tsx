"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Decorative cursor follower. Only for fine pointers without a
 * reduced-motion preference; otherwise it is not rendered at all.
 */
export default function CursorDot() {
  const dot = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => {
      if (!dot.current) return;
      dot.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[9998] w-2 h-2 rounded-full bg-gold opacity-70 hidden md:block"
      style={{ willChange: "transform", transform: "translate(-20px, -20px)" }}
    />
  );
}
