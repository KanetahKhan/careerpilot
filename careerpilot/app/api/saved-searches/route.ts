import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

const CreateSchema = z.object({
  label: z.string().max(200).optional(),
  query: z.string().min(1).max(500),
  location: z.string().max(200).optional(),
});

/** List the user's saved searches. */
export async function GET() {
  const user = await requireUser();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ searches: data ?? [] });
}

/** Save a new search query. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { label, query, location } = parsed.data;
  const autoLabel = label ?? query.slice(0, 60);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id: user.id,
      label: autoLabel,
      query,
      location: location ?? "",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ search: data });
}

/** Delete a saved search by ?id=. */
export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
