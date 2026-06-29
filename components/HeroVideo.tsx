"use client";

import { useEffect, useRef } from "react";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure autoplay works even if browser policy deferred it
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-105"
        style={{ willChange: "transform" }}
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — keeps text readable */}
      <div className="absolute inset-0 bg-[#0a0a0a]/70" />

      {/* Fade to solid at the bottom so sections below blend cleanly */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a0a] to-transparent" />

      {/* Subtle vignette on the sides */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#0a0a0a_100%)] opacity-60" />
    </div>
  );
}
