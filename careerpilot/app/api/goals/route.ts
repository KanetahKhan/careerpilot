import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, DEMO_USER_ID } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("due_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: DEMO_USER_ID, title: body.title, due_date: body.due_date ?? null })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}

export async function PATCH(req: NextRequest) {
  const { id, done } = await req.json();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("goals")
    .update({ done })
    .eq("id", id)
    .eq("user_id", DEMO_USER_ID)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}
