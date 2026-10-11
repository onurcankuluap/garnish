import Link from "next/link";

export function Coupe({ width = 30, height = 38 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 42" fill="none" aria-hidden="true">
      <path d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z" stroke="#c9a84c" strokeWidth="1" strokeLinejoin="round" fill="rgba(201,168,76,0.05)" />
      <line x1="16" y1="28" x2="16" y2="36" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" />
      <line x1="9" y1="36" x2="23" y2="36" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" />
      <circle cx="27" cy="6.5" r="3.8" stroke="#c9a84c" strokeWidth=".7" fill="none" />
      <line x1="27" y1="2.7" x2="27" y2="10.3" stroke="#c9a84c" strokeWidth=".5" />
      <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke="#c9a84c" strokeWidth=".5" />
      <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke="#c9a84c" strokeWidth=".5" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link className="logo" href="/">
      <Coupe />
      <span className="wm">
        <i />
        <b>Garnish</b>{" "}
        <s>Private Bartending</s>
      </span>
    </Link>
  );
}
