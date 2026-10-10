import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "Garnish — Private Bartending";

const GOLD = "#c9a84c";

/**
 * Social card built only from existing brand assets: the coupe-glass mark,
 * the ink/gold palette and the wordmark text. No photos, no claims beyond
 * the published event types.
 */
export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f0ece4",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 1, background: "rgba(201,168,76,0.25)" }} />
        <svg width="132" height="172" viewBox="0 0 32 42" fill="none">
          <path d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z" stroke={GOLD} strokeWidth="0.9" strokeLinejoin="round" fill="rgba(201,168,76,0.06)" />
          <line x1="16" y1="28" x2="16" y2="36" stroke={GOLD} strokeWidth="0.9" strokeLinecap="round" />
          <line x1="9" y1="36" x2="23" y2="36" stroke={GOLD} strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="27" cy="6.5" r="3.8" stroke={GOLD} strokeWidth="0.6" fill="none" />
          <line x1="27" y1="2.7" x2="27" y2="10.3" stroke={GOLD} strokeWidth="0.45" strokeLinecap="round" />
          <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke={GOLD} strokeWidth="0.45" strokeLinecap="round" />
          <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke={GOLD} strokeWidth="0.45" strokeLinecap="round" />
        </svg>
        <div style={{ width: 220, height: 1, background: "rgba(201,168,76,0.6)", marginTop: 40, marginBottom: 24 }} />
        <div style={{ fontSize: 76, letterSpacing: 22, fontWeight: 600, marginLeft: 22 }}>GARNISH</div>
        <div style={{ fontSize: 24, letterSpacing: 9, color: "#a3a3a3", marginTop: 16, marginLeft: 9 }}>
          PRIVATE BARTENDING
        </div>
        <div style={{ fontSize: 24, color: GOLD, marginTop: 56, letterSpacing: 2 }}>
          Weddings · Private parties · Corporate events
        </div>
      </div>
    ),
    OG_SIZE
  );
}
