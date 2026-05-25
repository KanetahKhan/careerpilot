"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground font-bold text-lg hover:opacity-80 transition-opacity"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <span>CareerPilot</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
