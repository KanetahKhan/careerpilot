"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <FadeIn>
    <div className="space-y-6 py-4">
      <div>
        <p className="label mb-2">Settings</p>
        <h1 className="font-display text-3xl font-bold">Preferences</h1>
      </div>

      <div className="panel flex items-center justify-between p-5">
        <div>
          <p className="font-medium text-foreground">Theme</p>
          <p className="text-sm text-muted-foreground">Switch between dark and light mode</p>
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="btn-ghost"
        >
          {theme === "dark" ? (
            <><Sun className="h-4 w-4" /> Light</>
          ) : (
            <><Moon className="h-4 w-4" /> Dark</>
          )}
        </button>
      </div>
    </div>
    </FadeIn>
  );
}
