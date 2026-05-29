"use client";

type Props = {
  /** 0..100 */
  value: number;
  size?: number;
  stroke?: number;
  /** CSS color for the progress arc (defaults to the theme primary). */
  color?: string;
  /** Text shown in the center; defaults to the rounded percentage. */
  center?: React.ReactNode;
};

/**
 * Lightweight SVG donut/ring progress indicator — the signature "dashboard" look.
 * Pure SVG (no charting dep), theme-aware via CSS vars, animates the arc on change.
 */
export function ProgressRing({
  value,
  size = 76,
  stroke = 8,
  color = "hsl(var(--primary))",
  center,
}: Props) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-base font-bold text-foreground">
          {center ?? `${Math.round(pct)}%`}
        </span>
      </div>
    </div>
  );
}
