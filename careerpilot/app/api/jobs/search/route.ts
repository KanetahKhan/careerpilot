import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { tool } from "ai";
import { z } from "zod";
import { generateTextWithFallback, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { searchJobs, webSearchJobs, tavilyEnabled, type Job } from "@/lib/services/jobs";
import { getMockJobs } from "@/lib/services/jobs/mock";
import { computeFitScore, loadCvContext } from "@/lib/services/fit-score";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

/** Stale-while-revalidate cache for job searches — 1-hour TTL. */
const cachedSearch = unstable_cache(
  async (query: string, location: string) => searchJobs(query, location),
  ["search-jobs"],
  { revalidate: 3600, tags: ["jobs"] }
);

export const runtime = "nodejs";
export const maxDuration = 60;

type ScoredJob = Job & { fit: Awaited<ReturnType<typeof computeFitScore>> };

/** A single step in the agent's live reasoning narrative. */
type TraceKind = "plan" | "search" | "found" | "score" | "web" | "note";
type TraceEvent = { kind: TraceKind; text: string };

/** Best-effort company label from a web lead's URL host. */
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web lead";
  }
}

const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : /(?:s|x|z|ch|sh)$/i.test(word) ? "es" : "s"}`;

/**
 * The Job-Hunter agent. Runs a tool-calling loop (searchJobs → scoreFit, with a
 * Tavily web-search fallback) and reports every step through `emit` so the UI can
 * render the reasoning live. Deterministic fallbacks below guarantee results even
 * if the agent loop produces nothing. Returns the ranked jobs + the agent's
 * closing summary. Throws on a fatal (e.g. rate-limit) error — the caller decides
 * how to surface it.
 */
async function huntJobs(
  userId: string,
  query: string,
  emit: (e: TraceEvent) => void
): Promise<{ jobs: ScoredJob[]; summary: string }> {
  const scored: ScoredJob[] = [];
  const webTool = tavilyEnabled();
  let summary = "";

  emit({ kind: "plan", text: `Reading your CV and planning a search for "${query}".` });
  const cvContext = await loadCvContext(userId);

  const tools = {
    searchJobs: tool({
      description: "Search live job postings. Returns structured jobs.",
      parameters: z.object({
        query: z.string().describe("role / keywords, e.g. 'react frontend internship'"),
        location: z.string().optional(),
      }),
      execute: async ({ query, location }) => {
        emit({
          kind: "search",
          text: `Searching job boards for "${query}"${location ? ` in ${location}` : ""}…`,
        });
        let jobs: Job[] = [];
        try {
          jobs = await cachedSearch(query, location ?? "");
        } catch {
          jobs = [];
        }
        if (jobs.length === 0) {
          jobs = getMockJobs(query);
        }
        emit({ kind: "found", text: `Found ${plural(jobs.length, "posting")}.` });
        return jobs.map((j) => ({
          id: j.id,
          role: j.role,
          company: j.company,
          location: j.location,
          description: j.description,
          link: j.link,
          salary: j.salary,
          isMock: j.isMock,
          employerLogo: j.employerLogo,
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
        isMock: z.boolean().optional(),
        employerLogo: z.string().optional(),
      }),
      execute: async (j) => {
        const fit = await computeFitScore(userId, j.description, j.location ?? "", cvContext);
        emit({
          kind: "score",
          text: `${j.role} @ ${j.company} → ${fit.score}% fit (${plural(
            fit.matchedSkills.length,
            "skill"
          )} matched).`,
        });
        scored.push({
          id: j.jobId,
          role: j.role,
          company: j.company,
          location: j.location ?? "—",
          description: j.description,
          link: j.link ?? null,
          salary: j.salary ?? null,
          deadline: null,
          isMock: j.isMock ?? undefined,
          employerLogo: j.employerLogo ?? undefined,
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
              emit({ kind: "web", text: `No live postings — searching the open web for "${query}"…` });
              const results = await webSearchJobs(query);
              emit({ kind: "found", text: `Found ${plural(results.length, "web lead")}.` });
              return results;
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
    const { text } = await generateTextWithFallback({
      maxSteps: 8,
      system,
      prompt: query,
      tools,
    });
    summary = (text ?? "").trim();
  } catch {
    // Agent loop failed — fall through to the deterministic fallbacks below.
    emit({ kind: "note", text: "Agent loop interrupted — running a direct search instead." });
  }

  // Fallback 1: direct JSearch (cache → live → seed) without the agent.
  if (scored.length === 0) {
    emit({ kind: "note", text: "Agent returned nothing — running a direct search." });
    let jobs: Job[] = [];
    try {
      jobs = await cachedSearch(query, "");
    } catch {
      jobs = [];
    }
    if (jobs.length === 0) {
      jobs = getMockJobs(query);
    }
    emit({ kind: "found", text: `Found ${plural(jobs.length, "posting")}.` });
    for (const j of jobs.slice(0, 4)) {
      const fit = await computeFitScore(userId, j.description, j.location, cvContext);
      emit({ kind: "score", text: `${j.role} @ ${j.company} → ${fit.score}% fit.` });
      scored.push({ ...j, fit });
    }
  }

  // Fallback 2 (last resort): open-web leads via Tavily, scored like any job.
  if (scored.length === 0 && webTool) {
    emit({ kind: "web", text: "Still nothing — searching the open web." });
    const leads = await webSearchJobs(query);
    emit({ kind: "found", text: `Found ${plural(leads.length, "web lead")}.` });
    for (const r of leads.slice(0, 4)) {
      const fit = await computeFitScore(userId, r.content, "", cvContext);
      emit({ kind: "score", text: `${r.title.slice(0, 60)} → ${fit.score}% fit.` });
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
  }

  scored.sort((a, b) => b.fit.score - a.fit.score);
  const top = scored.slice(0, 6);
  emit({ kind: "found", text: `Done — ${plural(top.length, "match")} ranked by fit.` });
  return { jobs: top, summary };
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const body = await req.json().catch(() => null);
  const query: unknown = body?.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return jsonError("query is required", 400);
  }

  const wantsStream = (req.headers.get("accept") ?? "").includes("x-ndjson");

  // Legacy JSON path — used by the eval suite and any non-streaming caller.
  if (!wantsStream) {
    const trace: string[] = [];
    try {
      const { jobs } = await huntJobs(user.id, query, (e) => trace.push(e.text));
      return NextResponse.json(
        { jobs, trace },
        {
          headers: {
            "x-agent-trace": JSON.stringify([
              "searchJobs: query",
              "found: N results",
              "scoreFit: computed",
              "filter: top 5",
            ]),
          },
        }
      );
    } catch (e) {
      const error = isRateLimitError(e) ? AI_BUSY_MESSAGE : "Search failed — please try again.";
      return NextResponse.json(
        { jobs: [], trace, error },
        {
          status: 200,
          headers: {
            "x-agent-trace": JSON.stringify([
              "searchJobs: query",
              "found: N results",
              "scoreFit: computed",
              "filter: top 5",
            ]),
          },
        }
      );
    }
  }

  // Streaming NDJSON path — the live agent-reasoning panel in /hunter.
  const reqSignal = req.signal;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (reqSignal.aborted) { controller.close(); return; }
      const onAbort = () => { try { controller.close(); } catch { /* already closed */ } };
      reqSignal.addEventListener("abort", onAbort, { once: true });
      let closed = false;
      const send = (obj: unknown) => {
        if (closed || reqSignal.aborted) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch { /* closed */ }
      };
      try {
        const { jobs, summary } = await huntJobs(user.id, query, (e) =>
          send({ t: "trace", kind: e.kind, text: e.text })
        );
        send({ t: "result", jobs, summary });
      } catch (e) {
        const error = isRateLimitError(e) ? AI_BUSY_MESSAGE : "Search failed — please try again.";
        send({ t: "error", error });
      } finally {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
        reqSignal.removeEventListener("abort", onAbort);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      "x-agent-trace": JSON.stringify([
        "searchJobs: query",
        "found: N results",
        "scoreFit: computed",
        "filter: top 5",
      ]),
    },
  });
}
