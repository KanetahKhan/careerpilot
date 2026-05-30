import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { loadCvContext, computeFitScore } from "@/lib/services/fit-score/fit-score";

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

/** Fetch the URL and pull out readable text. Cheap, dependency-free. */
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
  if (!ct.includes("text/") && !ct.includes("html") && !ct.includes("xml") && !ct.includes("json")) {
    throw new Error("URL did not return text content");
  }
  const html = (await res.text()).slice(0, 400_000);
  return stripHtml(html).slice(0, MAX_JD_CHARS);
}

/** Drop scripts/styles, strip tags, collapse whitespace. Good enough for JDs. */
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    let jd = (parsed.data.jd ?? "").trim();
    if (!jd && parsed.data.url) {
      try {
        jd = await fetchJdFromUrl(parsed.data.url);
      } catch (e: any) {
        return NextResponse.json(
          { error: e?.message ?? "Could not read the URL" },
          { status: 400 }
        );
      }
    }
    if (!jd) {
      return NextResponse.json(
        { error: "Could not extract any job text" },
        { status: 400 }
      );
    }
    jd = jd.slice(0, MAX_JD_CHARS);

    const cv = await loadCvContext(user.id);
    if (cv.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Upload your CV first so the fit score has something to compare against." },
        { status: 400 }
      );
    }

    const fit = await computeFitScore(user.id, jd, parsed.data.location ?? "", cv);
    return NextResponse.json({ fit, jdPreview: jd.slice(0, 600) });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: e?.message ?? "Fit scoring failed" },
      { status: 500 }
    );
  }
}
