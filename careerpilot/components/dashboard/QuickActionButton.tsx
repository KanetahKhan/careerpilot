import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  href: string;
  color?: "primary" | "secondary";
}

export function QuickActionButton({ icon: Icon, label, href, color = "secondary" }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all duration-200",
        color === "primary"
          ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
          : "border border-border/50 bg-card/60 hover:bg-card hover:border-primary/30 text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", color === "primary" ? "text-primary-foreground" : "text-primary")} />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
