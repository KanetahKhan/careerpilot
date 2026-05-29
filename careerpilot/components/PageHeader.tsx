import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: React.ReactNode;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Tailwind gradient color stops, e.g. "from-sky-500 via-sky-500 to-cyan-500". */
  gradient?: string;
  /** Right-side actions (buttons, toggles). */
  children?: React.ReactNode;
};

/**
 * Shared gradient page banner so every screen opens with a friendly, colorful
 * hero instead of a flat title. Each page passes its own accent gradient + icon.
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  icon: Icon,
  gradient = "from-primary via-violet-500 to-fuchsia-500",
  children,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg sm:p-7",
        gradient
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 right-28 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Icon size={24} />
            </span>
          )}
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-0.5 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-white/80">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
