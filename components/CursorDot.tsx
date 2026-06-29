"use client";

import { useEffect, useRef } from "react";

export default function CursorDot() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dot.current) return;
      dot.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={dot}
      className="pointer-events-none fixed top-0 left-0 z-[9998] w-2 h-2 rounded-full bg-gold opacity-70 transition-opacity duration-300 hidden md:block"
      style={{ willChange: "transform" }}
    />
  );
}
