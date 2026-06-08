"use client";

import { ReactNode, useEffect, useRef } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  direction = "up",
  className = "",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timeout = setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0) translateX(0)";
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [delay]);

  const directions: Record<string, string> = {
    up: "translateY(24px)",
    down: "translateY(-24px)",
    left: "translateX(24px)",
    right: "translateX(-24px)",
    none: "none",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: directions[direction],
        transition: `opacity ${duration}s ease-out, transform ${duration}s ease-out`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
