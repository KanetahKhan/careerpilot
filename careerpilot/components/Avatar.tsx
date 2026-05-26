import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ src, name, size = 40, className }: Props) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-primary/10 text-primary font-medium shrink-0 select-none",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }}
      aria-label={name ?? "User avatar"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  const trimmed = name.trim();
  if (!trimmed) return "U";

  // Treat an email by taking the local part's first letter.
  if (trimmed.includes("@")) {
    return (trimmed[0] || "U").toUpperCase();
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
