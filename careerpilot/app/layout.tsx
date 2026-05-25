import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerPilot — Your Agentic Career Co-pilot",
  description: "AI-powered job search, fit scoring, and application tracking grounded in your actual CV.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
