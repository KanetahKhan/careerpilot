import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { generateObjectWithFallback } from "@/lib/ai";
import { insertNotifications } from "./tracker";

const NUDGE_TYPES = ["apply", "goal", "skill", "general"] as const;

/**
 * Structured action attached to a nudge so the UI can wire a real button.
 * Today only `hunter_search`; the discriminated union lets us add more
 * (e.g. `roadmap_open`, `goal_create`) without breaking older rows.
 */
const NudgeActionSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("hunter_search"),
      query: z
        .string()
        .min(3)
        .max(120)
        .describe(
          "concrete role/keyword query for the Job Hunter, grounded in the user's CV (e.g. 'react frontend internship', 'python data analyst remote') — never generic"
        ),
    }),
  ])
  .nullable()
  .optional();

export type NudgeAction = z.infer<typeof NudgeActionSchema>;

const NudgesSchema = z.object({
  nudges: z
    .array(
      z.object({
        message: z
          .string()
          .describe("one short (<= ~22 words), specific, actionable reminder grounded ONLY in the given facts"),
        type: z.enum(NUDGE_TYPES),
        action: NudgeActionSchema,
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
  cvSnippet: string;
  topSkills: string[];
};

/** Pull the user's REAL tracker data + a small CV snippet — no LLM, no invented numbers. */
async function gatherContext(userId: string): Promise<NudgeContext> {
  const supabase = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [appsRes, goalsRes, cvCountRes, cvChunksRes] = await Promise.all([
    supabase.from("applications").select("status, created_at").eq("user_id", userId),
    supabase.from("goals").select("title, due_date, done").eq("user_id", userId),
    supabase.from("cv_chunks").select("id", { count: "exact", head: true }).eq("user_id", userId),
    // Pull the cheapest grounding signal for hunter queries: summary + skills.
    supabase
      .from("cv_chunks")
      .select("section, content")
      .eq("user_id", userId)
      .in("section", ["summary", "skills"])
      .order("position", { ascending: true }),
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

  const cvRows = (cvChunksRes.data ?? []) as { section: string; content: string }[];
  const summary = cvRows.find((c) => c.section === "summary")?.content ?? "";
  const skillsText = cvRows
    .filter((c) => c.section === "skills")
    .map((c) => c.content)
    .join(", ");
  const topSkills = skillsText
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 32)
    .slice(0, 12);
  const cvSnippet = [summary, skillsText].filter(Boolean).join("\n").slice(0, 800);

  return {
    totalApps: apps.length,
    appsThisWeek,
    statusCounts,
    totalGoals: (goalsRes.data ?? []).length,
    openGoals: open.length,
    overdueGoals,
    upcomingGoals,
    hasCv: (cvCountRes.count ?? 0) > 0,
    cvSnippet,
    topSkills,
  };
}

type GeneratedNudge = {
  message: string;
  type: string;
  action?: NudgeAction;
};

/** Build a CV-grounded hunter query for rule-based fallbacks. */
function ruleHunterQuery(ctx: NudgeContext): string | null {
  if (!ctx.hasCv) return null;
  const tech = ctx.topSkills
    .filter((s) => /^[A-Za-z0-9.+#-]{2,}$/.test(s))
    .slice(0, 2)
    .join(" ");
  if (!tech) return null;
  return `${tech.toLowerCase()} internship`;
}

/** Deterministic nudges from the same facts — used if the LLM is unavailable. */
function ruleBasedNudges(ctx: NudgeContext): GeneratedNudge[] {
  const out: GeneratedNudge[] = [];
  const hunterQuery = ruleHunterQuery(ctx);

  out.push(
    ctx.appsThisWeek === 0
      ? {
          message: "You haven't logged any applications in the last 7 days. Aim to apply to 3 roles today.",
          type: "apply",
          action: hunterQuery ? { type: "hunter_search", query: hunterQuery } : null,
        }
      : {
          message: `You've logged ${ctx.appsThisWeek} application(s) this week — add 1-2 more to keep momentum.`,
          type: "apply",
          action: hunterQuery ? { type: "hunter_search", query: hunterQuery } : null,
        }
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

  let nudges: GeneratedNudge[];
  try {
    const cvBlock = ctx.hasCv
      ? `- CV snippet (summary + skills, truncated):\n${ctx.cvSnippet || "(empty)"}\n- Top CV skills: ${ctx.topSkills.join(", ") || "(none parsed)"}`
      : `- CV uploaded: no`;

    const { object } = await generateObjectWithFallback({
      schema: NudgesSchema,
      prompt: `You are CareerPilot's proactive career coach. Using ONLY the facts below, write 2-4 short
(max ~22 words), specific, actionable nudges for this job seeker. Do NOT invent any numbers or facts
that are not given. Tag each nudge with a type: "apply" (applying to jobs), "goal" (their goals/to-dos),
"skill" (CV/skills), or "general".

ACTIONS:
- When a nudge is about applying to jobs or surfacing matches (typically type="apply"), you MUST attach an
  action of type "hunter_search". The action.query MUST be a concrete role/keyword phrase grounded in this
  user's CV — pick from their actual skills/headline — not a generic placeholder like "jobs" or "internships".
  Examples of good queries: "react frontend internship", "python data analyst remote", "ml engineer entry".
- For "goal", "skill", or "general" nudges, omit the action (set it to null) unless the nudge explicitly
  steers the user to search for jobs.

FACTS (this user's real tracker data):
- Applications total: ${ctx.totalApps}; logged in the last 7 days: ${ctx.appsThisWeek}
- Applications by status: ${JSON.stringify(ctx.statusCounts)}
- Goals: ${ctx.totalGoals} total, ${ctx.openGoals} still open
- Overdue goals: ${ctx.overdueGoals.length ? ctx.overdueGoals.map((g) => `"${g.title}" (due ${g.due_date})`).join(", ") : "none"}
- Upcoming goals: ${ctx.upcomingGoals.length ? ctx.upcomingGoals.map((g) => `"${g.title}" (due ${g.due_date})`).join(", ") : "none"}
${cvBlock}`,
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
