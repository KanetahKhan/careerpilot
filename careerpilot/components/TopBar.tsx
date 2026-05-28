"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, LogOut, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { createBrowserClient } from "@supabase/ssr";

export function TopBar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

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

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 rounded-lg bg-secondary animate-pulse" />
          ) : user ? (
            <>
              <Link
                href="/hunter"
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-all"
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                      {(user.email?.[0] || "U").toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/auth?mode=signup"
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.25)";
                }}
              >
                Get Started
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
