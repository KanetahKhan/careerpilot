import { z } from "zod";
import { NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/services/assistant";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { route, parseJson, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const RoadmapSchema = z.object({
  goal: z.string().max(500).optional(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  await enforceRateLimit(user.id, "roadmap", "heavy");

  const { goal } = await parseJson(req, RoadmapSchema);
  const plan = await generateRoadmap(user.id, goal ?? "");

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

  if (error) throw new ApiError(error.message, 500);

  return NextResponse.json({
    id: (data as { id: string }).id,
    roadmap: plan,
    completed: {},
  });
});
