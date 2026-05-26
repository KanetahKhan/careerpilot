"use client";

import { cn } from "@/lib/utils";

type Props = {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  /**
   * Border gradient stops. Defaults to the project's primary/accent tokens so
   * the shine tracks light/dark mode automatically.
   */
  color?: string | string[];
  className?: string;
  children: React.ReactNode;
};

const DEFAULT_COLOR = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--primary))",
];

/**
 * Animated shine border. Pure CSS — no JS animation, respects
 * `prefers-reduced-motion` (`motion-safe:animate-*`). The shine itself is
 * a masked radial gradient that scrolls across an outer pseudo-element.
 */
export function ShineBorder({
  borderRadius = 14,
  borderWidth = 2,
  duration = 14,
  color = DEFAULT_COLOR,
  className,
  children,
}: Props) {
  const stops = Array.isArray(color) ? color.join(", ") : color;
  return (
    <div
      style={
        {
          "--shine-radius": `${borderRadius}px`,
          "--shine-width": `${borderWidth}px`,
          "--shine-duration": `${duration}s`,
          "--shine-gradient": `radial-gradient(transparent, transparent, ${stops}, transparent, transparent)`,
        } as React.CSSProperties
      }
      className={cn(
        "relative inline-grid place-items-center rounded-[var(--shine-radius)]",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[var(--shine-radius)] p-[var(--shine-width)]",
          "[background:var(--shine-gradient)] [background-size:300%_300%]",
          "[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
          "[mask-composite:exclude] [-webkit-mask-composite:xor]",
          "motion-safe:animate-[shine-pulse_var(--shine-duration)_linear_infinite]"
        )}
      />
      {children}
    </div>
  );
}
