"use client";

import { useEffect, useRef } from "react";

/**
 * Background loop. It starts only after hydration and only when the visitor
 * has not asked for reduced motion or reduced data; otherwise the dark
 * overlay stays as a still backdrop. Pauses when the tab is hidden.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

    const sync = () => {
      if (reduce.matches || saveData || document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    sync();
    reduce.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      reduce.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover scale-105"
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay keeps text readable */}
      <div className="absolute inset-0 bg-[#0a0a0a]/70 pointer-events-none" />

      {/* Fade to solid at the bottom so sections below blend cleanly */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />

      {/* Subtle vignette on the sides */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#0a0a0a_100%)] opacity-60 pointer-events-none" />
    </div>
  );
}
