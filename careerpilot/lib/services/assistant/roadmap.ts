import { z } from "zod";
import { generateObjectWithFallback } from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";

/**
 * The schema the LLM is asked to produce — simple strings for actions.
 * We transform this into the keyed shape (`PersistedRoadmap`) before
 * persisting or returning, so the client never has to invent keys and
 * checkbox state survives reloads.
 */
export const RoadmapSchema = z.object({
  goal: z.string().describe("the target role/outcome this plan works toward"),
  summary: z.string().describe("1-2 sentence framing of the plan and the main gaps it closes"),
  weeks: z
    .array(
      z.object({
        week: z.number(),
        focus: z.string(),
        actions: z.array(z.string()),
        milestone: z.string(),
      })
    )
    .min(3)
    .max(8),
  citedSections: z
    .array(z.string())
    .describe("CV sections the plan drew on, e.g. experience, skills"),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;

export type RoadmapItem = { key: string; text: string };
export type PersistedRoadmapWeek = {
  week: number;
  focus: string;
  actions: RoadmapItem[];
  milestone: RoadmapItem;
};
export type PersistedRoadmap = {
  goal: string;
  summary: string;
  weeks: PersistedRoadmapWeek[];
  citedSections: string[];
};

/** Stable item-key helpers — the source of truth for checkbox identity. */
export const actionKey = (week: number, index: number) => `w${week}-a${index}`;
export const milestoneKey = (week: number) => `w${week}-m`;

/** Project the LLM output into the keyed, persistable shape. */
export function toPersistedRoadmap(r: Roadmap): PersistedRoadmap {
  return {
    goal: r.goal,
    summary: r.summary,
    citedSections: r.citedSections,
    weeks: r.weeks.map((w) => ({
      week: w.week,
      focus: w.focus,
      actions: w.actions.map((text, i) => ({ key: actionKey(w.week, i), text })),
      milestone: { key: milestoneKey(w.week), text: w.milestone },
    })),
  };
}

/** Total action count (milestones are tracked separately and don't count toward %). */
export function totalActionCount(plan: PersistedRoadmap): number {
  return plan.weeks.reduce((n, w) => n + w.actions.length, 0);
}

/** Count actions marked done in the completion map. Ignores milestones. */
export function doneActionCount(
  plan: PersistedRoadmap,
  completed: Record<string, boolean>
): number {
  let n = 0;
  for (const w of plan.weeks) {
    for (const a of w.actions) if (completed[a.key]) n++;
  }
  return n;
}

/** % complete over ACTION items; 0 when the plan is empty. */
export function roadmapPercent(
  plan: PersistedRoadmap,
  completed: Record<string, boolean>
): number {
  const total = totalActionCount(plan);
  if (total === 0) return 0;
  return Math.round((doneActionCount(plan, completed) / total) * 100);
}

/** Collect every valid action+milestone key — used to validate PATCH input. */
export function allItemKeys(plan: PersistedRoadmap): Set<string> {
  const s = new Set<string>();
  for (const w of plan.weeks) {
    for (const a of w.actions) s.add(a.key);
    s.add(w.milestone.key);
  }
  return s;
}

export async function generateRoadmap(userId: string, goal: string): Promise<PersistedRoadmap> {
  const target = goal.trim() || "becoming job-ready for the user's target roles";

  let context = "(No CV uploaded yet.)";
  try {
    const chunks = await retrieveChunks(
      userId,
      `${target} — relevant skills, experience, and gaps`,
      6
    );
    context = formatContext(chunks);
  } catch {
    /* retrieval best-effort; the plan is still useful, just less personalized */
  }

  const { object } = await generateObjectWithFallback({
    schema: RoadmapSchema,
    prompt: `You are CareerPilot. Build a focused, week-by-week roadmap toward this goal: "${target}".
Ground it STRICTLY in the user's CV below: target their REAL gaps, build on REAL
strengths, and never invent experience. Use 4-8 weeks. Each week needs a clear
focus, 2-4 concrete actions, and a measurable milestone. Set citedSections to the
CV sections you actually drew on.

=== USER CV CONTEXT ===
${context}
=======================`,
  });

  const final: Roadmap = { ...object, goal: goal.trim() || object.goal };
  return toPersistedRoadmap(final);
}
