import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(80, "display_name must be 80 characters or fewer")
    .optional(),
});

async function fetchOrCreateProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  // Lazy-create — covers users that pre-date the handle_new_user trigger.
  const { data: inserted, error: insertErr } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("id, display_name, avatar_url")
    .single();
  if (insertErr) throw insertErr;
  return inserted;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const profile = await fetchOrCreateProfile(user.id);
    return NextResponse.json({ profile });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    await fetchOrCreateProfile(user.id);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.display_name !== undefined) {
      update.display_name = parsed.data.display_name || null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("id, display_name, avatar_url")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profile: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to update profile" },
      { status: 500 }
    );
  }
}
