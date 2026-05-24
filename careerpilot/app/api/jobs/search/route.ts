import { NextResponse } from "next/server";
import { generateText, tool } from "ai";
import { z } from "zod";
import { chatModel, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { searchJobs, type Job } from "@/lib/services/jobs";
import { computeFitScore, loadCvContext } from "@/lib/services/fit-score";
import { DEMO_USER_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The Job Hunter AGENT. The LLM is given two tools and runs a tool-calling
 * loop (search → score → decide) until it has the best matches. We collect the
 * scored jobs out-of-band so the UI gets structured cards, not just prose.
 *
 * Quota note: the user's CV skills/centroid are loaded ONCE per request
 * (loadCvContext) and reused across every job, so we make far fewer AI calls.
 */
export async function POST(req: Request) {
  const { query }: { query: string } = await req.json();

  const scored: (Job & { fit: Awaited<ReturnType<typeof computeFitScore>> })[] = [];
  const trace: string[] = [];

  try {
    // Build the per-request CV snapshot once (one CV-skill extraction, not one per job).
    const cvContext = await loadCvContext(DEMO_USER_ID);

    try {
      await generateText({
        model: chatModel,
        maxSteps: 8,
        system: `You are a job-hunting agent. Given the user's natural-language request:
1. Call searchJobs with a clean query (and location if implied).
2. For EACH returned job, call scoreFit with its description to compute a real fit score.
3. Stop once every returned job has been scored. Then briefly summarize the top matches.`,
        prompt: query,
        tools: {
          searchJobs: tool({
            description: "Search live job postings. Returns structured jobs.",
            parameters: z.object({
              query: z.string().describe("role / keywords, e.g. 'react frontend internship'"),
              location: z.string().optional(),
            }),
            execute: async ({ query, location }) => {
              trace.push(`searchJobs("${query}", "${location ?? ""}")`);
              const jobs = await searchJobs(query, location ?? "");
              return jobs.map((j) => ({
                id: j.id,
                role: j.role,
                company: j.company,
                location: j.location,
                description: j.description,
              }));
            },
          }),
          scoreFit: tool({
            description: "Compute a % fit score for a job against the user's CV.",
            parameters: z.object({
              jobId: z.string(),
              role: z.string(),
              company: z.string(),
              location: z.string().optional(),
              description: z.string(),
              link: z.string().optional(),
              salary: z.string().optional(),
            }),
            execute: async (j) => {
              trace.push(`scoreFit("${j.role}")`);
              const fit = await computeFitScore(DEMO_USER_ID, j.description, j.location ?? "", cvContext);
              scored.push({
                id: j.jobId,
                role: j.role,
                company: j.company,
                location: j.location ?? "—",
                description: j.description,
                link: j.link ?? null,
                salary: j.salary ?? null,
                deadline: null,
                fit,
              });
              return { score: fit.score, missing: fit.missingSkills.slice(0, 4) };
            },
          }),
        },
      });
    } catch {
      // Agent loop failed (e.g. rate limit). Fall through to a direct pass below;
      // if that also fails it propagates to the outer handler.
    }

    // Fallback: direct search + score so the demo still returns cards.
    if (scored.length === 0) {
      const jobs = await searchJobs(query);
      for (const j of jobs.slice(0, 4)) {
        const fit = await computeFitScore(DEMO_USER_ID, j.description, j.location, cvContext);
        scored.push({ ...j, fit });
      }
      trace.push("fallback: direct search + score");
    }
  } catch (e) {
    // Return 200 with a calm notice so the UI shows a friendly message, not a red error.
    const error = isRateLimitError(e) ? AI_BUSY_MESSAGE : "Search failed — please try again.";
    return NextResponse.json({ jobs: [], trace, error }, { status: 200 });
  }

  scored.sort((a, b) => b.fit.score - a.fit.score);
  return NextResponse.json({ jobs: scored.slice(0, 6), trace });
}
