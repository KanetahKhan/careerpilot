"use client";

import { useThemePreset } from "@/components/ThemePresetProvider";

export function AuthBackground() {
  const { preset } = useThemePreset();

  const gradients: Record<string, string> = {
    violet: "from-primary/20 via-secondary/10 to-accent/20",
    ocean: "from-primary/20 via-secondary/10 to-accent/20",
    forest: "from-primary/20 via-secondary/10 to-accent/20",
    rose: "from-primary/20 via-secondary/10 to-accent/20",
    amber: "from-primary/20 via-secondary/10 to-accent/20",
    slate: "from-primary/20 via-secondary/10 to-accent/20",
  };

  const gradient = gradients[preset.name] || gradients.violet;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-background">
      <div
        className={`absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br ${gradient} blur-3xl animate-orb-slow`}
      />
      <div
        className={`absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tl ${gradient} blur-3xl animate-orb-slow`}
        style={{ animationDelay: "-4s" }}
      />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-r ${gradient} blur-3xl animate-orb-pulse opacity-50`}
      />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
