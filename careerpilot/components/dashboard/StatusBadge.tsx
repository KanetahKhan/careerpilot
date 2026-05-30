import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  applied:
    "bg-primary/10 text-primary border-primary/20",
  interviewing:
    "bg-muted text-muted-foreground border-border",
  offer:
    "bg-primary/10 text-primary border-primary/20",
  rejected:
    "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", style)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
