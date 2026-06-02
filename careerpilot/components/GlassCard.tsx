import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

interface GlassCardProps extends PropsWithChildren {
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div className={cn("glass-card rounded-2xl relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
