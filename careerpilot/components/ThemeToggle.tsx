"use client";

import { useTheme } from "next-themes";
import { useThemePreset } from "@/components/ThemePresetProvider";
import { Sun, Moon, Check } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { preset, setPreset, presets } = useThemePreset();
  const [mounted, setMounted] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <div className="relative">
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPresets(!showPresets);
        }}
        className="inline-flex items-center justify-center rounded-md w-9 h-9 text-foreground hover:bg-secondary transition-colors border border-border"
        aria-label="Toggle theme"
        title="Click to toggle light/dark. Right-click for color preset."
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {showPresets && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPresets(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-xl p-2 z-50">
            <p className="text-xs text-muted-foreground px-2 py-1">Accent color</p>
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setPreset(p.name);
                  setShowPresets(false);
                }}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)` }}
                />
                {p.label}
                {preset.name === p.name && <Check className="h-3 w-3 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
