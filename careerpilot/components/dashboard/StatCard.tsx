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
    bg: "bg-blue-500/10 dark:bg-blue-400/10",
    icon: "text-blue-500 dark:text-blue-400",
    change: "text-blue-500 dark:text-blue-400",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
    icon: "text-amber-500 dark:text-amber-400",
    change: "text-amber-500 dark:text-amber-400",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-400/10",
    icon: "text-rose-500 dark:text-rose-400",
    change: "text-rose-500 dark:text-rose-400",
  },
  orange: {
    bg: "bg-orange-500/10 dark:bg-orange-400/10",
    icon: "text-orange-500 dark:text-orange-400",
    change: "text-orange-500 dark:text-orange-400",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    icon: "text-emerald-500 dark:text-emerald-400",
    change: "text-emerald-500 dark:text-emerald-400",
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
          <span className={cn("text-xs font-medium", changeType === "positive" ? s.change : changeType === "negative" ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground")}>
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
