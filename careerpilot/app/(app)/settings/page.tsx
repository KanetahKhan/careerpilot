"use client";

import { useTheme } from "next-themes";
import { useThemePreset } from "@/components/ThemePresetProvider";
import { Moon, Sun, Palette, LogOut, User, Bell, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { preset, setPreset, presets } = useThemePreset();
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
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences and workspace</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Theme mode</label>
            <div className="flex gap-2">
              {[
                { value: "light" as const, icon: Sun, label: "Light" },
                { value: "dark" as const, icon: Moon, label: "Dark" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all",
                    theme === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Accent color</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPreset(p.name)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 transition-all",
                    preset.name === p.name
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  <div
                    className="h-8 w-8 rounded-full shadow-sm"
                    style={{ backgroundColor: `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)` }}
                  />
                  <span className="text-xs text-muted-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Account</h2>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {user && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {(user.email?.charAt(0) || "U").toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground">End your current session</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Notification preferences coming soon.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Privacy settings coming soon.</p>
        </div>
      </section>
    </div>
  );
}
