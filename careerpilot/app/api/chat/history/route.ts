import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sessionId = new URL(req.url).searchParams.get("sessionId") || "default";

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const messages = (data ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    }));

    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load history" },
      { status: 500 }
    );
  }
}
