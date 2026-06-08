import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { loadCvContext, computeFitScore } from "@/lib/services/fit-score/fit-score";
import { route, parseJson, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z
  .object({
    jd: z.string().max(40_000).optional(),
    url: z.string().url().optional(),
    location: z.string().max(200).optional(),
  })
  .refine((b) => (b.jd && b.jd.trim().length > 0) || !!b.url, {
    message: "Provide either a job description (jd) or a URL",
  });

const MAX_JD_CHARS = 20_000;

async function fetchJdFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CareerPilotBot/1.0; +https://github.com/KanetahKhan/careerpilot)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Couldn't fetch URL (${res.status})`);
  const ct = res.headers.get("content-type") ?? "";
  if (
    !ct.includes("text/") &&
    !ct.includes("html") &&
    !ct.includes("xml") &&
    !ct.includes("json")
  ) {
    throw new Error("URL did not return text content");
  }
  const html = (await res.text()).slice(0, 400_000);
  return stripHtml(html).slice(0, MAX_JD_CHARS);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "fit/score", "medium");
  const body = await parseJson(req, BodySchema);

  let jd = (body.jd ?? "").trim();
  if (!jd && body.url) {
    try {
      jd = await fetchJdFromUrl(body.url);
    } catch (e: any) {
      throw new ApiError(e?.message ?? "Could not read the URL", 400);
    }
  }
  if (!jd) throw new ApiError("Could not extract any job text", 400);
  jd = jd.slice(0, MAX_JD_CHARS);

  const cv = await loadCvContext(user.id);
  if (cv.text.trim().length === 0) {
    throw new ApiError(
      "Upload your CV first so the fit score has something to compare against.",
      400,
    );
  }

  const fit = await computeFitScore(user.id, jd, body.location ?? "", cv);
  return NextResponse.json({ fit, jdPreview: jd.slice(0, 600) });
});
