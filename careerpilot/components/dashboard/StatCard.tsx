import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
}

export function StatCard({ icon: Icon, label, value, change, changeType = "neutral", subtitle }: StatCardProps) {
  return (
    <div className="panel p-5 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {change && (
          <span className={cn("text-xs font-medium", changeType === "positive" ? "text-primary" : changeType === "negative" ? "text-destructive" : "text-muted-foreground")}>
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
