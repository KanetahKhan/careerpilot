"use client";

import Link from "next/link";
import { Sparkles, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "./AuthProvider";
import { useLogout } from "@/hooks/useLogout";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user, loading } = useAuth();
  const handleLogout = useLogout();

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
              <div className="flex items-center gap-2">
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
                className="text-sm font-semibold text-primary-foreground px-5 py-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
              >
                Get Started
              </Link>
            </>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-md w-9 h-9 text-foreground hover:bg-secondary transition-colors border border-border"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
