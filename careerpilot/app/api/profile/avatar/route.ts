import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function listUserObjects(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId);
  if (error) throw error;
  return (data ?? []).map((o) => `${userId}/${o.name}`);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported image type — use png, jpeg, or webp" },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 2 MB limit" },
        { status: 413 }
      );
    }

    const supabase = await createClient();

    // Snapshot prior objects so we can purge them after the new upload succeeds.
    const previousPaths = await listUserObjects(supabase, user.id);

    const path = `${user.id}/${Date.now()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const avatar_url = publicData.publicUrl;

    const { error: dbErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id, avatar_url, updated_at: new Date().toISOString() });
    if (dbErr) {
      // Best-effort rollback of the orphaned upload.
      await supabase.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    const stale = previousPaths.filter((p) => p !== path);
    if (stale.length > 0) {
      await supabase.storage.from(BUCKET).remove(stale);
    }

    return NextResponse.json({ avatar_url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Avatar upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const paths = await listUserObjects(supabase, user.id);
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
      if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });
    }

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ avatar_url: null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
