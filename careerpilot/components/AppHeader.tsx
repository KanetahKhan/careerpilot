"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground font-bold text-lg hover:opacity-80 transition-opacity"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <span>CareerPilot</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground border border-border">
            Demo Mode
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
