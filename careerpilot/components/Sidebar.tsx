"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  FileText,
  MessageSquare,
  BarChart3,
  Gauge,
  Target,
  Route,
  Mic,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogIn,
  Rocket,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, id: "dashboard" },
  { href: "/hunter", label: "Job Hunter", icon: Search, id: "hunter" },
  { href: "/profile", label: "My CV", icon: FileText, id: "profile" },
  { href: "/assistant", label: "AI Coach", icon: MessageSquare, id: "assistant" },
  { href: "/tracker", label: "Tracker", icon: BarChart3, id: "tracker" },
  { href: "/skill-gap", label: "Skill Gap", icon: Gauge, id: "skill-gap" },
  { href: "/roadmap", label: "Roadmap", icon: Route, id: "roadmap" },
  { href: "/interview", label: "Mock Interview", icon: Mic, id: "interview" },
  { href: "/fit", label: "Score a JD", icon: Target, id: "fit" },
  { href: "/settings", label: "Settings", icon: Settings, id: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cycle: full → collapsed → hidden → full
  function toggleSidebar() {
    if (!collapsed) setCollapsed(true);
    else if (!hidden) setHidden(true);
    else { setCollapsed(false); setHidden(false); }
  }

  function showSidebar() {
    setHidden(false);
    setCollapsed(false);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-2 h-16 shrink-0 hover:opacity-80 transition-opacity",
          collapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Rocket className="h-5 w-5" />
        </span>
        <span className={cn(
          "font-display text-lg font-extrabold tracking-tight text-primary overflow-hidden whitespace-nowrap transition-all",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          CareerPilot
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center" : "",
                active
                  ? "bg-primary/10 text-primary font-semibold border-l-[3px] border-primary rounded-l-none"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border">
        {user ? (
          <div className="p-4">
            <div className="flex items-center gap-3" title={collapsed ? user.email ?? undefined : undefined}>
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
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={toggleSidebar}
                className="mx-auto mb-2 hidden md:grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Hide sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
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
                onClick={toggleSidebar}
                className="mb-2 hidden md:grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Collapse sidebar"
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
          "fixed left-0 top-0 z-50 h-screen w-64 bg-background shadow-xl transition-transform duration-300 md:hidden",
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
          "transition-all duration-200",
          hidden
            ? "hidden md:hidden"
            : "hidden md:flex flex-col border-r border-border bg-background sticky top-0 h-screen",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
      {hidden && (
        <button
          onClick={showSidebar}
          className="fixed left-0 top-1/2 z-30 hidden md:grid h-12 w-5 -translate-y-1/2 place-items-center rounded-r-md border border-border border-l-0 bg-background text-muted-foreground shadow-sm hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Show sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
