"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface WipeUpCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function WipeUpCard({ children, className, delay = 0 }: WipeUpCardProps) {
  return (
    <div
      className={cn(
        "opacity-0 translate-y-8",
        "[animation:fade-in-up_0.6s_ease-out_forwards]",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
}
