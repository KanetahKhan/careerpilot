import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
  accentColor?: "blue" | "amber" | "rose" | "orange" | "emerald";
}

const accentStyles: Record<string, { bg: string; icon: string; change: string }> = {
  blue: {
    bg: "bg-primary/10",
    icon: "text-primary",
    change: "text-primary",
  },
  amber: {
    bg: "bg-muted",
    icon: "text-muted-foreground",
    change: "text-muted-foreground",
  },
  rose: {
    bg: "bg-destructive/10",
    icon: "text-destructive",
    change: "text-destructive",
  },
  orange: {
    bg: "bg-accent/10",
    icon: "text-accent-foreground",
    change: "text-accent-foreground",
  },
  emerald: {
    bg: "bg-primary/10",
    icon: "text-primary",
    change: "text-primary",
  },
};

export function StatCard({ icon: Icon, label, value, change, changeType = "neutral", subtitle, accentColor = "blue" }: StatCardProps) {
  const s = accentStyles[accentColor] || accentStyles.blue;
  return (
    <div className="panel p-5 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-2xl", s.bg)}>
          <Icon className={cn("h-5 w-5", s.icon)} />
        </div>
        {change && (
          <span className={cn("text-xs font-medium", changeType === "positive" ? s.change : changeType === "negative" ? "text-destructive" : "text-muted-foreground")}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-display text-3xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</p>}
      </div>
    </div>
  );
}
