"use client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemePresetProvider } from "@/components/ThemePresetProvider";

interface ProvidersProps {
  children: React.ReactNode;
  /** CSP nonce forwarded from the middleware via the root layout. */
  nonce?: string;
}

export function Providers({ children, nonce }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} nonce={nonce}>
      <ThemePresetProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemePresetProvider>
    </ThemeProvider>
  );
}
