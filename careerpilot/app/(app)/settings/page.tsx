"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User, Bell, Shield, Upload, Trash2, Download, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { useSettings } from "@/lib/hooks/useSettings";
import type { NotificationSettings, PrivacySettings } from "@/lib/hooks/useSettings";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export default function SettingsPage() {
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
      } catch (e: unknown) {
        if (!cancelled) setSaveMsg({ kind: "err", text: getErrorMessage(e) });
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
    router.push("/");
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
    } catch (e: unknown) {
      setSaveMsg({ kind: "err", text: getErrorMessage(e) });
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
    } catch (e: unknown) {
      clearLocalPreview();
      setPhotoMsg({ kind: "err", text: getErrorMessage(e) });
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
    } catch (e: unknown) {
      setPhotoMsg({ kind: "err", text: getErrorMessage(e) });
    } finally {
      setPhotoBusy(false);
    }
  }

  const { preferences, loading: settingsLoading, updateField } = useSettings();

  const shownAvatar = previewUrl ?? profile?.avatar_url ?? null;
  const shownName =
    displayName.trim() || profile?.display_name || user?.email || "User";
  const hasPhoto = Boolean(profile?.avatar_url || previewUrl);

  const notif = preferences.notifications!;
  const priv = preferences.privacy!;

  const notifFields: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: "job_match_alerts", label: "Job match alerts", desc: "Get notified when new jobs match your profile" },
    { key: "application_reminders", label: "Application reminders", desc: "Receive reminders to follow up on applications" },
    { key: "weekly_digest", label: "Weekly digest", desc: "A weekly summary of job recommendations and activity" },
    { key: "email_notifications", label: "Email notifications", desc: "Receive notifications via email" },
    { key: "push_notifications", label: "Push notifications", desc: "Receive push notifications in your browser" },
  ] as const;

  const privacySelects: { key: keyof PrivacySettings; label: string; options: { value: string; label: string }[] }[] = [
    {
      key: "profile_visibility",
      label: "Profile visibility",
      options: [
        { value: "public", label: "Public — anyone can see your profile" },
        { value: "private", label: "Private — only you can see your profile" },
        { value: "connections", label: "Connections — only your connections" },
      ],
    },
    {
      key: "cv_sharing",
      label: "CV sharing",
      options: [
        { value: "all", label: "All employers — share CV with all employers" },
        { value: "applied", label: "Applied only — share CV after you apply" },
        { value: "none", label: "None — do not share your CV" },
      ],
    },
  ] as const;

  const privacyToggles: { key: keyof PrivacySettings; label: string; desc: string }[] = [
    { key: "analytics_consent", label: "Usage analytics", desc: "Help us improve with anonymous usage data" },
    { key: "public_fit_scores", label: "Public fit scores", desc: "Show your match scores on your public profile" },
  ] as const;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        subtitle="Manage your preferences and workspace."
        icon={SettingsIcon}
        gradient="from-primary via-primary to-primary/70"
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
                    photoMsg.kind === "ok" ? "text-primary" : "text-destructive"
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
                    saveMsg.kind === "ok" ? "text-primary" : "text-destructive"
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
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {settingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : (
            notifFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.desc}</p>
                </div>
                <Switch
                  id={`notif-${field.key}`}
                  checked={notif[field.key]}
                  onChange={(e) => updateField("notifications", field.key, e.target.checked)}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {settingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : (
            <>
              {privacySelects.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label htmlFor={`priv-${field.key}`} className="text-sm font-medium text-foreground">
                    {field.label}
                  </label>
                  <Select
                    id={`priv-${field.key}`}
                    value={priv[field.key] as string}
                    options={field.options}
                    onChange={(e) => updateField("privacy", field.key, e.target.value)}
                  />
                </div>
              ))}
              <hr className="border-border" />
              {privacyToggles.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{field.desc}</p>
                  </div>
                  <Switch
                    id={`priv-${field.key}`}
                    checked={priv[field.key] as boolean}
                    onChange={(e) => updateField("privacy", field.key, e.target.checked)}
                  />
                </div>
              ))}
              <hr className="border-border" />
              <div className="pt-2">
                <p className="text-sm font-medium text-foreground mb-1">Export your data</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Download all your profile data, CVs, and applications.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => {}}>
                  <Download className="h-3.5 w-3.5" />
                  Export Data
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
