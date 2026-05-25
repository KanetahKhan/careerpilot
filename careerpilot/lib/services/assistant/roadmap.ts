import { z } from "zod";
import { generateObjectWithFallback } from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";

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

export async function generateRoadmap(userId: string, goal: string): Promise<Roadmap> {
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

  return { ...object, goal: goal.trim() || object.goal };
}
