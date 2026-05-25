import { NextResponse } from "next/server";
import { generateText, tool } from "ai";
import { z } from "zod";
import { chatModel, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { searchJobs, type Job } from "@/lib/services/jobs";
import { computeFitScore, loadCvContext } from "@/lib/services/fit-score";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser();
  const { query }: { query: string } = await req.json();

  const scored: (Job & { fit: Awaited<ReturnType<typeof computeFitScore>> })[] = [];
  const trace: string[] = [];

  try {
    const cvContext = await loadCvContext(user.id);

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
              const fit = await computeFitScore(user.id, j.description, j.location ?? "", cvContext);
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
      // Agent loop failed — fall through to direct pass
    }

    if (scored.length === 0) {
      const jobs = await searchJobs(query);
      for (const j of jobs.slice(0, 4)) {
        const fit = await computeFitScore(user.id, j.description, j.location, cvContext);
        scored.push({ ...j, fit });
      }
      trace.push("fallback: direct search + score");
    }
  } catch (e) {
    const error = isRateLimitError(e) ? AI_BUSY_MESSAGE : "Search failed — please try again.";
    return NextResponse.json({ jobs: [], trace, error }, { status: 200 });
  }

  scored.sort((a, b) => b.fit.score - a.fit.score);
  return NextResponse.json({ jobs: scored.slice(0, 6), trace });
}
