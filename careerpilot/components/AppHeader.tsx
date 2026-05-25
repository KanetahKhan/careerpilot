"use client";

import Link from "next/link";
import { Sparkles, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { createBrowserClient } from "@supabase/ssr";

export function AppHeader() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
          {user && (
            <span className="hidden sm:inline-flex items-center gap-2 text-xs text-muted-foreground">
              {user.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
