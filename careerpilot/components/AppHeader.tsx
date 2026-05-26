"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { Avatar } from "./Avatar";
import { createBrowserClient } from "@supabase/ssr";

type Profile = { display_name: string | null; avatar_url: string | null };

export function AppHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.profile) setProfile(j.profile);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email || null;

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
          {loading ? (
            <div className="h-6 w-24 rounded-md bg-secondary animate-pulse" />
          ) : user ? (
            <>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-secondary/60 transition-colors"
                title="Edit profile"
              >
                <Avatar
                  src={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null}
                  name={displayName}
                  size={28}
                />
                <span className="hidden sm:inline text-xs text-muted-foreground max-w-[180px] truncate">
                  {displayName}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
