import { useId } from "react";

export function Logo({ size = 32 }: { size?: number }) {
  const uniqueId = useId().replace(/:/g, "");
  const shieldId = `pc-shield-${uniqueId}`;
  const checkId = `pc-check-${uniqueId}`;
  const glowId = `pc-glow-${uniqueId}`;
  const blurId = `pc-blur-${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={shieldId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={checkId} x1="16" y1="20" x2="52" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
        <radialGradient id={glowId} cx="32" cy="30" r="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle cx="32" cy="30" r="26" fill={`url(#${glowId})`} />

      {/* Shield */}
      <path
        d="M32 3 L56 11 V29 C56 43 46 54 32 60 C18 54 8 43 8 29 V11 Z"
        fill={`url(#${shieldId})`}
        fillOpacity="0.28"
        stroke={`url(#${shieldId})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Inner shield line */}
      <path
        d="M32 8 L51 14 V29 C51 40 43 49 32 54 C21 49 13 40 13 29 V14 Z"
        stroke={`url(#${shieldId})`}
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
        strokeLinejoin="round"
      />

      {/* Soccer ball pentagon dots (subtle) */}
      <g fill={`url(#${shieldId})`} fillOpacity="0.75">
        <circle cx="22" cy="20" r="1.4" />
        <circle cx="42" cy="20" r="1.4" />
        <circle cx="32" cy="14" r="1.4" />
      </g>

      {/* Check mark — hero element */}
      <path
        d="M19 32 L28 41 L46 21"
        stroke={`url(#${checkId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${blurId})`}
        opacity="0.6"
      />
      <path
        d="M19 32 L28 41 L46 21"
        stroke={`url(#${checkId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Spark accent */}
      <path
        d="M46 21 L48 19 M46 21 L48 23 M46 21 L44 19"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoWithName({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Logo size={size} />
      <span className="font-display text-lg font-bold tracking-tight">
        Placar<span className="text-primary"> Certo</span>
      </span>
    </div>
  );
}
