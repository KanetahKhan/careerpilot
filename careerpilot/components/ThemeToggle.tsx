"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center rounded-md w-9 h-9 text-foreground hover:bg-secondary transition-colors border border-border"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
