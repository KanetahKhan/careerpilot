"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Sparkles,
  Kanban,
  Route,
  FileText,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogIn,
  Target,
  Gauge,
  Mic,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/hunter", label: "Job Hunter", icon: Search, badge: null as null },
  { href: "/fit", label: "Score a JD", icon: Target, badge: null as null },
  { href: "/skill-gap", label: "Skill Gap", icon: Gauge, badge: null as null },
  { href: "/interview", label: "Mock Interview", icon: Mic, badge: null as null },
  { href: "/assistant", label: "AI Coach", icon: Sparkles, badge: null as null },
  { href: "/tracker", label: "Tracker", icon: Kanban, badge: "apps" as const },
  { href: "/roadmap", label: "Roadmap", icon: Route, badge: "goals" as const },
  { href: "/profile", label: "My CV", icon: FileText, badge: "chunks" as const },
  { href: "/settings", label: "Settings", icon: Settings, badge: null as null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [appCount, setAppCount] = useState(0);
  const [pendingGoals, setPendingGoals] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((j) => setAppCount(j.applications?.length ?? 0))
      .catch(() => {});
    fetch("/api/goals")
      .then((r) => r.json())
      .then((j) => {
        const goals = j.goals ?? [];
        setPendingGoals(goals.filter((g: any) => !g.done).length);
      })
      .catch(() => {});
    fetch("/api/cv/profile")
      .then((r) => r.json())
      .then((j) => setChunkCount(j.totalChunks ?? 0))
      .catch(() => {});
  }, []);

  const badgeValue = (badge: string | null): number => {
    if (badge === "apps") return appCount;
    if (badge === "goals") return pendingGoals;
    if (badge === "chunks") return chunkCount;
    return 0;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-2 h-16 shrink-0 hover:opacity-80 transition-opacity",
          collapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
        <span className={cn(
          "font-bold text-foreground overflow-hidden whitespace-nowrap transition-all",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          CareerPilot
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const count = badgeValue(item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "",
                active
                  ? "border-r-2 border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border">
        {user ? (
          <div className="p-4">
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {(user.email?.charAt(0) || "U").toUpperCase()}
                  </span>
                </div>
              )}
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <Link
              href="/login"
              className={cn(
                "flex items-center gap-2 text-sm text-primary hover:underline transition-colors",
                collapsed && "justify-center"
              )}
            >
              <LogIn size={16} />
              {!collapsed && <span>Sign in</span>}
            </Link>
          </div>
        )}
        <div className="p-4 pt-0">
          {collapsed ? (
            <>
              <button
                onClick={() => setCollapsed(false)}
                className="mx-auto mb-2 hidden md:grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCollapsed(true)}
                className="mb-2 hidden md:grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-foreground shadow-md md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-background shadow-xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-background transition-all duration-200",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
