import { z } from "zod";
import { generateObjectWithFallback } from "@/lib/ai";

/** The intents the assistant adapts its answer format to. */
export const INTENTS = [
  "readiness_check",
  "skill_gap",
  "roadmap",
  "cover_letter",
  "general",
] as const;
export type Intent = (typeof INTENTS)[number];

// Ordered keyword rules — first match wins. Cheap, deterministic, free.
const RULES: { intent: Intent; re: RegExp }[] = [
  { intent: "cover_letter", re: /\bcover[\s-]?letter|write me a letter|draft a letter\b/i },
  { intent: "roadmap", re: /\broad\s?map|study plan|learning plan|week[\s-]?by[\s-]?week|plan to (become|get|land|be)|get (me )?job[\s-]?ready|become job[\s-]?ready|\d+[\s-]?(week|month) plan\b/i },
  { intent: "skill_gap", re: /\bskill gaps?|what (skills? )?(am i missing|do i (need|lack))|what'?s missing|am i lacking|what should i learn\b/i },
  { intent: "readiness_check", re: /\bam i ready|ready for|qualified for|good fit for|can i apply|how ready|my chances?\b/i },
];

/** Fast, deterministic keyword classifier. Returns "general" when unsure. */
export function heuristicIntent(query: string): Intent {
  for (const { intent, re } of RULES) if (re.test(query)) return intent;
  return "general";
}

/**
 * Classify a query's intent. Tries the keyword heuristic first (free + instant);
 * only when that is unsure ("general") does it spend ONE cheap structured Gemini
 * call. Any failure falls back to "general", so the chat never breaks on this.
 */
export async function classifyIntent(query: string): Promise<Intent> {
  const h = heuristicIntent(query);
  if (h !== "general") return h;
  if (!query.trim()) return "general";
  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({ intent: z.enum(INTENTS) }),
      prompt: `Classify this career question into exactly one intent.
Intents: ${INTENTS.join(", ")}.
- readiness_check: "am I ready / qualified for role X?"
- skill_gap: "what skills am I missing?"
- roadmap: "give me a plan to get there"
- cover_letter: "write a cover letter"
- general: anything else.
Question: "${query.slice(0, 500)}"`,
    });
    return object.intent;
  } catch {
    return "general";
  }
}

/** Per-intent formatting guidance appended to the grounded system prompt. */
export function intentGuidance(intent: Intent): string {
  switch (intent) {
    case "readiness_check":
      return `INTENT: readiness check. Open with a one-line verdict (Ready / Nearly there / Not yet), then 2-4 concrete reasons grounded in the CV, then the single most important next step.`;
    case "skill_gap":
      return `INTENT: skill gap. List the specific skills the target role needs that the CV does NOT evidence, ordered by priority. Only flag a gap you can justify against the CV; note existing strengths briefly.`;
    case "roadmap":
      return `INTENT: roadmap. Produce a numbered week-by-week plan that closes the user's REAL gaps from the CV. Each week: a focus + 2-3 concrete actions; end with a measurable milestone. Mention that the /roadmap page renders a structured version.`;
    case "cover_letter":
      return `INTENT: cover letter. Write a concise, specific letter that quotes real items from the CV. No clichés, no invented experience.`;
    default:
      return "";
  }
}
