import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { generateObjectWithFallback } from "@/lib/ai";
import { insertNotifications } from "./tracker";

const NUDGE_TYPES = ["apply", "goal", "skill", "general"] as const;

const NudgesSchema = z.object({
  nudges: z
    .array(
      z.object({
        message: z
          .string()
          .describe("one short (<= ~22 words), specific, actionable reminder grounded ONLY in the given facts"),
        type: z.enum(NUDGE_TYPES),
      })
    )
    .min(2)
    .max(4),
});

type NudgeContext = {
  totalApps: number;
  appsThisWeek: number;
  statusCounts: Record<string, number>;
  totalGoals: number;
  openGoals: number;
  overdueGoals: { title: string; due_date: string }[];
  upcomingGoals: { title: string; due_date: string }[];
  hasCv: boolean;
};

/** Pull the user's REAL tracker data — no LLM, no invented numbers. */
async function gatherContext(userId: string): Promise<NudgeContext> {
  const supabase = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [appsRes, goalsRes, cvRes] = await Promise.all([
    supabase.from("applications").select("status, created_at").eq("user_id", userId),
    supabase.from("goals").select("title, due_date, done").eq("user_id", userId),
    supabase.from("cv_chunks").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const apps = appsRes.data ?? [];
  const statusCounts: Record<string, number> = {};
  let appsThisWeek = 0;
  for (const a of apps) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    if (a.created_at && a.created_at >= weekAgo) appsThisWeek++;
  }

  const open = (goalsRes.data ?? []).filter((g) => !g.done);
  const overdueGoals = open
    .filter((g) => g.due_date && g.due_date < today)
    .map((g) => ({ title: g.title as string, due_date: g.due_date as string }));
  const upcomingGoals = open
    .filter((g) => g.due_date && g.due_date >= today)
    .map((g) => ({ title: g.title as string, due_date: g.due_date as string }));

  return {
    totalApps: apps.length,
    appsThisWeek,
    statusCounts,
    totalGoals: (goalsRes.data ?? []).length,
    openGoals: open.length,
    overdueGoals,
    upcomingGoals,
    hasCv: (cvRes.count ?? 0) > 0,
  };
}

/** Deterministic nudges from the same facts — used if the LLM is unavailable. */
function ruleBasedNudges(ctx: NudgeContext): { message: string; type: string }[] {
  const out: { message: string; type: string }[] = [];
  out.push(
    ctx.appsThisWeek === 0
      ? { message: "You haven't logged any applications in the last 7 days. Aim to apply to 3 roles today.", type: "apply" }
      : { message: `You've logged ${ctx.appsThisWeek} application(s) this week — add 1-2 more to keep momentum.`, type: "apply" }
  );
  if (ctx.overdueGoals.length) {
    const g = ctx.overdueGoals[0];
    out.push({ message: `Goal overdue: "${g.title}" (due ${g.due_date}). Finish it or reschedule today.`, type: "goal" });
  } else if (ctx.upcomingGoals.length) {
    const g = ctx.upcomingGoals[0];
    out.push({ message: `Upcoming goal: "${g.title}" (due ${g.due_date}). Block time for it this week.`, type: "goal" });
  }
  if (!ctx.hasCv) {
    out.push({ message: "Upload your CV so matches and coaching are grounded in your real experience.", type: "skill" });
  }
  if (out.length < 2) {
    out.push({ message: "Set one concrete, measurable goal for this week in your tracker.", type: "general" });
  }
  return out.slice(0, 4);
}

/**
 * Generate 2-4 proactive nudges grounded in the user's real data, persist them,
 * and return the inserted rows. Exactly ONE LLM call (with Gemini->Groq
 * fallback); if AI fails entirely, falls back to deterministic rule-based nudges.
 */
export async function generateNudges(userId: string) {
  const ctx = await gatherContext(userId);

  let nudges: { message: string; type: string }[];
  try {
    const { object } = await generateObjectWithFallback({
      schema: NudgesSchema,
      prompt: `You are CareerPilot's proactive career coach. Using ONLY the facts below, write 2-4 short
(max ~22 words), specific, actionable nudges for this job seeker. Do NOT invent any numbers or facts
that are not given. Tag each nudge with a type: "apply" (applying to jobs), "goal" (their goals/to-dos),
"skill" (CV/skills), or "general".

FACTS (this user's real tracker data):
- Applications total: ${ctx.totalApps}; logged in the last 7 days: ${ctx.appsThisWeek}
- Applications by status: ${JSON.stringify(ctx.statusCounts)}
- Goals: ${ctx.totalGoals} total, ${ctx.openGoals} still open
- Overdue goals: ${ctx.overdueGoals.length ? ctx.overdueGoals.map((g) => `"${g.title}" (due ${g.due_date})`).join(", ") : "none"}
- Upcoming goals: ${ctx.upcomingGoals.length ? ctx.upcomingGoals.map((g) => `"${g.title}" (due ${g.due_date})`).join(", ") : "none"}
- CV uploaded: ${ctx.hasCv ? "yes" : "no"}`,
    });
    nudges = object.nudges;
  } catch {
    nudges = ruleBasedNudges(ctx);
  }
  if (!nudges.length) nudges = ruleBasedNudges(ctx);

  const { data, error } = await insertNotifications(userId, nudges);
  if (error) throw new Error(error.message);
  return data ?? [];
}
