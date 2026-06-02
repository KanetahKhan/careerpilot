"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useThemePreset } from "@/components/ThemePresetProvider";
import { Moon, Sun, Palette, LogOut, User, Bell, Shield, Upload, Trash2, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { preset, setPreset, presets } = useThemePreset();
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // next-themes and the preset provider both read from localStorage, so the
  // server renders the default state. Gate any UI that depends on those
  // values on `mounted` so the first client render matches the server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load profile");
        if (cancelled) return;
        setProfile(json.profile);
        setDisplayName(json.profile?.display_name ?? "");
      } catch (e: any) {
        if (!cancelled) setSaveMsg({ kind: "err", text: e.message });
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Release any blob: URL we created for the local preview.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function saveDisplayName() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const next = displayName.trim();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      setProfile(json.profile);
      setDisplayName(json.profile?.display_name ?? "");
      setSaveMsg({ kind: "ok", text: "Saved." });
    } catch (e: any) {
      setSaveMsg({ kind: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  function clearLocalPreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoMsg(null);

    if (!ALLOWED_MIME.has(file.type)) {
      setPhotoMsg({ kind: "err", text: "Use a PNG, JPEG, or WebP image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhotoMsg({ kind: "err", text: "Image exceeds the 2 MB limit." });
      return;
    }

    // Instant local preview.
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreviewUrl(localUrl);

    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setProfile((p) => (p ? { ...p, avatar_url: json.avatar_url } : p));
      clearLocalPreview();
      setPhotoMsg({ kind: "ok", text: "Photo updated." });
    } catch (e: any) {
      clearLocalPreview();
      setPhotoMsg({ kind: "err", text: e.message });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    if (!profile?.avatar_url && !previewUrl) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove photo");
      setProfile((p) => (p ? { ...p, avatar_url: null } : p));
      clearLocalPreview();
      setPhotoMsg({ kind: "ok", text: "Photo removed." });
    } catch (e: any) {
      setPhotoMsg({ kind: "err", text: e.message });
    } finally {
      setPhotoBusy(false);
    }
  }

  const shownAvatar = previewUrl ?? profile?.avatar_url ?? null;
  const shownName =
    displayName.trim() || profile?.display_name || user?.email || "User";
  const hasPhoto = Boolean(profile?.avatar_url || previewUrl);

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        subtitle="Manage your preferences and workspace."
        icon={SettingsIcon}
        gradient="from-slate-600 via-slate-600 to-slate-700"
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-start gap-4">
            <Avatar src={shownAvatar} name={shownName} size={72} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{shownName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={photoBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {photoBusy ? "Uploading…" : "Change photo"}
                </Button>
                {hasPhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={photoBusy}
                    onClick={removePhoto}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove photo
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                PNG, JPEG, or WebP · max 2 MB
              </p>
              {photoMsg && (
                <p
                  className={cn(
                    "mt-2 text-xs",
                    photoMsg.kind === "ok" ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {photoMsg.text}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="display-name" className="text-sm font-medium text-foreground">
              Display name
            </label>
            <Input
              id="display-name"
              value={displayName}
              maxLength={80}
              placeholder={profileLoading ? "Loading…" : "Your name"}
              disabled={profileLoading || saving}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={saving || profileLoading}
                onClick={saveDisplayName}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              {saveMsg && (
                <span
                  className={cn(
                    "text-xs",
                    saveMsg.kind === "ok" ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {saveMsg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

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
                    mounted && theme === t.value
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
                    mounted && preset.name === p.name
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

        <div className="rounded-xl border border-border bg-card p-6">
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
