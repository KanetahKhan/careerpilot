"use client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";

interface ProvidersProps {
  children: React.ReactNode;
  /** CSP nonce forwarded from the middleware via the root layout. */
  nonce?: string;
}

export function Providers({ children, nonce }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} nonce={nonce}>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
