import type { LucideIcon } from "lucide-react";

type Props = {
  title: React.ReactNode;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Accepted for backwards-compat with callers; not used in the Skybound style. */
  gradient?: string;
  /** Right-side actions (buttons, toggles). */
  children?: React.ReactNode;
};

/**
 * Shared page banner — Skybound style: a soft sky-blue gradient with dark teal
 * text and a faint oversized icon, so every screen opens light and airy.
 */
export function PageHeader({ title, eyebrow, subtitle, icon: Icon, children }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 shadow-[0_20px_45px_-20px_rgba(2,132,199,0.25)] sm:p-8">
      {Icon && (
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 text-primary/10"
          size={170}
          strokeWidth={1.5}
        />
      )}
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon size={24} />
            </span>
          )}
          <div>
            {eyebrow && (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/70">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 font-display text-3xl font-bold text-primary sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
