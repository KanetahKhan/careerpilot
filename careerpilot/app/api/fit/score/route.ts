import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { loadCvContext, computeFitScore } from "@/lib/services/fit-score/fit-score";
import { getErrorMessage } from "@/lib/errors";

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

const ALLOWED_DOMAINS = [
  "linkedin.com",
  "www.linkedin.com",
  "greenhouse.io",
  "boards.greenhouse.io",
  "lever.co",
  "jobs.lever.co",
  "indeed.com",
  "www.indeed.com",
  "glassdoor.com",
  "www.glassdoor.com",
];

function isPrivateIP(hostname: string): boolean {
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (!ipRegex.test(hostname)) return false;

  const parts = hostname.split(".").map(Number);
  if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 loopback
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 link-local
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}

/** Fetch the URL and pull out readable text. Hardened for SSRF. */
async function fetchJdFromUrl(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP/HTTPS URLs are allowed");
  }

  if (isPrivateIP(url.hostname)) {
    throw new Error("Internal URLs are not allowed");
  }

  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname === "0.0.0.0") {
    throw new Error("Internal URLs are not allowed");
  }

  const isAllowed = ALLOWED_DOMAINS.some(
    (d) => url.hostname === d || url.hostname.endsWith(`.${d}`)
  );
  if (!isAllowed) {
    throw new Error(`Domain not allowed: ${url.hostname}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "CareerPilot-Bot/1.0 (Job-Description-Scraper)",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      throw new Error("Redirects are not allowed");
    }
    if (!res.ok) throw new Error(`Couldn't fetch URL (${res.status})`);

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > 2 * 1024 * 1024) {
      throw new Error("Content too large");
    }

    const text = await res.text();
    if (text.length > 2 * 1024 * 1024) {
      throw new Error("Content too large");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
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
      } catch (e: unknown) {
        return NextResponse.json(
          { error: getErrorMessage(e) },
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
  } catch (e: unknown) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}
