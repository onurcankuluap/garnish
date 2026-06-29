import Link from "next/link";

interface Props {
  /** Scale relative to the default nav size */
  scale?: number;
  className?: string;
}

/** The coupe-glass SVG mark */
function CoupeMark({ size }: { size: number }) {
  return (
    <svg
      width={size * 0.78}
      height={size}
      viewBox="0 0 32 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bowl — symmetrical coupe shape */}
      <path
        d="M3 8 L29 8 Q27 20 16 28 Q5 20 3 8 Z"
        stroke="#c9a84c"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="rgba(201,168,76,0.05)"
      />

      {/* Stem */}
      <line
        x1="16" y1="28" x2="16" y2="36"
        stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"
      />

      {/* Foot */}
      <line
        x1="9" y1="36" x2="23" y2="36"
        stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"
      />

      {/* Citrus wheel garnish on right rim */}
      <circle cx="27" cy="6.5" r="3.8" stroke="#c9a84c" strokeWidth="0.7" fill="none" />
      {/* Citrus spokes */}
      <line x1="27" y1="2.7" x2="27" y2="10.3" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round" />
      <line x1="23.5" y1="4.6" x2="30.5" y2="8.4" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round" />
      <line x1="23.5" y1="8.4" x2="30.5" y2="4.6" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round" />
    </svg>
  );
}

export default function GarnishLogo({ scale = 1, className = "" }: Props) {
  const markH = Math.round(38 * scale);

  return (
    <Link href="/" className={`flex items-center gap-3 group ${className}`}>
      <CoupeMark size={markH} />

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        {/* Thin rule above brand name */}
        <span
          className="block h-px bg-gold/40 mb-[5px]"
          style={{ width: Math.round(68 * scale) }}
        />
        <span
          className="font-cormorant font-semibold tracking-[0.22em] uppercase text-foreground group-hover:text-gold transition-colors duration-300"
          style={{ fontSize: Math.round(16 * scale) }}
        >
          Garnish
        </span>
        <span
          className="font-inter tracking-[0.28em] uppercase text-[var(--muted-light)] mt-[4px]"
          style={{ fontSize: Math.round(7.5 * scale) }}
        >
          Private Bartending
        </span>
      </div>
    </Link>
  );
}
