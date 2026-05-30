import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  applied:
    "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20",
  interviewing:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20",
  offer:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20",
  rejected:
    "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-400 dark:border-rose-400/20",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", style)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
