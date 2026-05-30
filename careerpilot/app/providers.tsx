"use client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemePresetProvider } from "@/components/ThemePresetProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemePresetProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemePresetProvider>
    </ThemeProvider>
  );
}
