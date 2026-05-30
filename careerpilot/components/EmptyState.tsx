import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Tailwind text color for the icon, e.g. "text-sky-500". */
  accent?: string;
  /** Tailwind tinted background for the icon tile, e.g. "bg-sky-500/10". */
  iconBg?: string;
  /** Optional CTA / actions. */
  children?: React.ReactNode;
};

/** Friendly, illustrated-feeling empty state — a tinted icon tile + warm copy. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  accent = "text-primary",
  iconBg = "bg-primary/10",
  children,
}: Props) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className={cn("grid h-16 w-16 place-items-center rounded-2xl", iconBg)}>
        <Icon className={cn("h-8 w-8", accent)} />
      </span>
      <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
