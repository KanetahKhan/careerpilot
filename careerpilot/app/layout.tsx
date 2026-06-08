import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { headers } from "next/headers";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerPilot — Your Agentic Career Co-pilot",
  description: "AI-powered job search, fit scoring, and application tracking grounded in your actual CV.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the per-request nonce forwarded by middleware so next-themes' inline script
  // gets the nonce attribute and isn't blocked by the Content-Security-Policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
