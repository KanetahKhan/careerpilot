"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { themePresets, ThemePreset, getPresetCSS } from "@/lib/themes";

interface ThemePresetContextType {
  preset: ThemePreset;
  setPreset: (name: string) => void;
  presets: ThemePreset[];
}

const ThemePresetContext = createContext<ThemePresetContextType | undefined>(undefined);

export function ThemePresetProvider({ children }: { children: React.ReactNode }) {
  const [presetName, setPresetName] = useState("violet");

  useEffect(() => {
    const saved = localStorage.getItem("careerpilot-theme-preset");
    if (saved && themePresets.find(p => p.name === saved)) {
      setPresetName(saved);
    }
  }, []);

  const setPreset = (name: string) => {
    setPresetName(name);
    localStorage.setItem("careerpilot-theme-preset", name);
  };

  const preset = themePresets.find(p => p.name === presetName) || themePresets[0];

  useEffect(() => {
    const css = getPresetCSS(preset);
    Object.entries(css).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [preset]);

  return (
    <ThemePresetContext.Provider value={{ preset, setPreset, presets: themePresets }}>
      {children}
    </ThemePresetContext.Provider>
  );
}

export function useThemePreset() {
  const ctx = useContext(ThemePresetContext);
  if (!ctx) throw new Error("useThemePreset must be used within ThemePresetProvider");
  return ctx;
}
