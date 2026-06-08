import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notificationSettingsSchema = z.object({
  job_match_alerts: z.boolean(),
  application_reminders: z.boolean(),
  weekly_digest: z.boolean(),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
});

const privacySettingsSchema = z.object({
  profile_visibility: z.enum(["public", "private", "connections"]),
  cv_sharing: z.enum(["all", "applied", "none"]),
  analytics_consent: z.boolean(),
  public_fit_scores: z.boolean(),
});

const preferencesSchema = z.object({
  notifications: notificationSettingsSchema.optional(),
  privacy: privacySettingsSchema.optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const preferences = (data?.preferences as Record<string, unknown>) ?? {};
    return NextResponse.json({ preferences });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;

    const body = await req.json().catch(() => ({}));
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const current = (existing?.preferences as Record<string, unknown>) ?? {};
    const merged = {
      ...current,
      ...(parsed.data.notifications !== undefined && {
        notifications: { ...(current.notifications as Record<string, unknown> ?? {}), ...parsed.data.notifications },
      }),
      ...(parsed.data.privacy !== undefined && {
        privacy: { ...(current.privacy as Record<string, unknown> ?? {}), ...parsed.data.privacy },
      }),
    };

    const { error } = await supabase
      .from("profiles")
      .update({ preferences: merged, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ preferences: merged });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
