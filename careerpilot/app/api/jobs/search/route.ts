import { NextResponse } from "next/server";
import { tool } from "ai";
import { z } from "zod";
import { generateTextWithFallback, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { searchJobs, webSearchJobs, tavilyEnabled, type Job } from "@/lib/services/jobs";
import { computeFitScore, loadCvContext } from "@/lib/services/fit-score";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Best-effort company label from a web lead's URL host. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web lead";
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { query }: { query: string } = await req.json();

  const scored: (Job & { fit: Awaited<ReturnType<typeof computeFitScore>> })[] = [];
  const trace: string[] = [];
  const webTool = tavilyEnabled();

  try {
    const cvContext = await loadCvContext(user.id);

    const tools = {
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
      // Tavily fallback tool — only exposed to the agent when a key is configured.
      ...(webTool
        ? {
            webSearchJobs: tool({
              description:
                "FALLBACK web search for job leads via Tavily. Use ONLY when searchJobs returns an empty list. Returns less-structured web results (title, url, content).",
              parameters: z.object({
                query: z.string().describe("role / keywords to find job openings on the open web"),
              }),
              execute: async ({ query }) => {
                trace.push(`webSearchJobs("${query}")`);
                return webSearchJobs(query);
              },
            }),
          }
        : {}),
    };

    const system = `You are a job-hunting agent. Given the user's natural-language request:
1. Call searchJobs with a clean query (and location if implied).
2. For EACH returned job, call scoreFit with its description to compute a real fit score.${
      webTool
        ? `
3. If searchJobs returns an EMPTY list, call webSearchJobs with the same query. For EACH web result, infer a role and company from its title/url, then call scoreFit with description set to the result's content and link set to its url.`
        : ""
    }
${webTool ? "4" : "3"}. Stop once every job/lead has been scored, then briefly summarize the top matches.`;

    try {
      await generateTextWithFallback({
        maxSteps: 8,
        system,
        prompt: query,
        tools,
      });
    } catch {
      // Agent loop failed — fall through to the deterministic fallbacks below.
    }

    // Fallback 1: direct JSearch (cache → live → seed) without the agent.
    if (scored.length === 0) {
      const jobs = await searchJobs(query);
      for (const j of jobs.slice(0, 4)) {
        const fit = await computeFitScore(user.id, j.description, j.location, cvContext);
        scored.push({ ...j, fit });
      }
      if (jobs.length) trace.push("fallback: direct search + score");
    }

    // Fallback 2 (last resort): open-web leads via Tavily, scored like any job.
    if (scored.length === 0 && webTool) {
      const leads = await webSearchJobs(query);
      for (const r of leads.slice(0, 4)) {
        const fit = await computeFitScore(user.id, r.content, "", cvContext);
        scored.push({
          id: r.url,
          role: r.title.slice(0, 120),
          company: hostLabel(r.url),
          location: "—",
          description: r.content,
          link: r.url,
          salary: null,
          deadline: null,
          fit,
        });
      }
      if (leads.length) trace.push("fallback: web search (Tavily)");
    }
  } catch (e) {
    const error = isRateLimitError(e) ? AI_BUSY_MESSAGE : "Search failed — please try again.";
    return NextResponse.json({ jobs: [], trace, error }, { status: 200 });
  }

  scored.sort((a, b) => b.fit.score - a.fit.score);
  return NextResponse.json({ jobs: scored.slice(0, 6), trace });
}
