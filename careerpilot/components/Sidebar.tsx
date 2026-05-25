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
} from "lucide-react";

const navItems = [
  { href: "/hunter", label: "Job Hunter", icon: Search, badge: null as null },
  { href: "/assistant", label: "AI Coach", icon: Sparkles, badge: null as null },
  { href: "/tracker", label: "Tracker", icon: Kanban, badge: "apps" as const },
  { href: "/roadmap", label: "Roadmap", icon: Route, badge: "goals" as const },
  { href: "/profile", label: "My CV", icon: FileText, badge: "chunks" as const },
  { href: "/settings", label: "Settings", icon: Settings, badge: null as null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
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
      {/* logo */}
      <Link
        href="/"
        className={`flex items-center gap-2 ${collapsed ? "justify-center px-0" : "px-4"} h-16 shrink-0 hover:opacity-80 transition-opacity`}
      >
        <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
        <span className={`font-bold text-foreground overflow-hidden whitespace-nowrap transition-all ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
          CareerPilot
        </span>
      </Link>

      {/* nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const count = badgeValue(item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "border-r-2 border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
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

      {/* footer */}
      <div className="border-t border-border p-4">
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
  );

  return (
    <>
      {/* mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-foreground shadow-md md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 bg-background shadow-xl transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-background transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
