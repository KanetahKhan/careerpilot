"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/hunter", label: "Job Hunter" },
  { href: "/assistant", label: "Assistant" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/tracker", label: "Tracker" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="flex items-center justify-between py-5">
      <Link href="/" className="group flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-signal text-ink-900 font-display font-bold shadow-glow">
          C
          <span className="absolute -inset-1 -z-10 rounded-xl bg-signal/30 blur-md animate-pulse-glow" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">
          Career<span className="text-signal">Pilot</span>
        </span>
      </Link>
      <nav className="flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800/60 p-1 backdrop-blur">
        {links.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                active ? "bg-signal text-ink-900 font-semibold" : "text-chalk-dim hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
