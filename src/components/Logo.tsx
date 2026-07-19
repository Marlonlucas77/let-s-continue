export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="pc-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 L42 9 V25 C42 35 34 42 24 45 C14 42 6 35 6 25 V9 Z"
        fill="url(#pc-grad)"
        fillOpacity="0.15"
        stroke="url(#pc-grad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15 24 L22 31 L34 17"
        stroke="url(#pc-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
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
