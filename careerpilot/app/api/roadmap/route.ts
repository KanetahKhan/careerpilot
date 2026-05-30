import { NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/services/assistant";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const { goal } = await req.json();
    const plan = await generateRoadmap(user.id, typeof goal === "string" ? goal : "");

    // Single active roadmap per user: deactivate previous, insert new.
    const supabase = createAdminClient();
    await supabase
      .from("roadmaps")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("roadmaps")
      .insert({
        user_id: user.id,
        goal: plan.goal,
        summary: plan.summary,
        plan,
        completed: {},
        is_active: true,
      })
      .select("id")
      .single();
    if (error) {
      // Persistence is required for interactivity — surface a clean error.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: (data as { id: string }).id,
      roadmap: plan,
      completed: {},
    });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: e?.message ?? "Roadmap generation failed" }, { status: 500 });
  }
}
