"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export type NotificationSettings = {
  job_match_alerts: boolean;
  application_reminders: boolean;
  weekly_digest: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
};

export type PrivacySettings = {
  profile_visibility: "public" | "private" | "connections";
  cv_sharing: "all" | "applied" | "none";
  analytics_consent: boolean;
  public_fit_scores: boolean;
};

export type Preferences = {
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  job_match_alerts: true,
  application_reminders: true,
  weekly_digest: false,
  email_notifications: true,
  push_notifications: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  profile_visibility: "private",
  cv_sharing: "applied",
  analytics_consent: true,
  public_fit_scores: false,
};

export function useSettings() {
  const [preferences, setPreferences] = useState<Preferences>({
    notifications: DEFAULT_NOTIFICATIONS,
    privacy: DEFAULT_PRIVACY,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
        if (cancelled) return;
        setPreferences((prev) => ({
          notifications: { ...DEFAULT_NOTIFICATIONS, ...json.preferences?.notifications },
          privacy: { ...DEFAULT_PRIVACY, ...json.preferences?.privacy },
        }));
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateField = useCallback(
    (section: "notifications" | "privacy", field: string, value: unknown) => {
      setPreferences((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: value },
      }));
      (async () => {
        try {
          const res = await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [section]: { [field]: value } }),
          });
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error ?? "Failed to save");
          }
        } catch (e: unknown) {
          setError(getErrorMessage(e));
          setPreferences((prev) => ({
            ...prev,
            [section]: { ...prev[section], [field]: !value },
          }));
        }
      })();
    },
    []
  );

  return { preferences, loading, error, updateField };
}
