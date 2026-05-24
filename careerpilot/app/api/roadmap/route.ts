import { NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/services/assistant";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Thin controller: produce a structured, CV-grounded roadmap for a goal. */
export async function POST(req: Request) {
  try {
    const { goal } = await req.json();
    const roadmap = await generateRoadmap(typeof goal === "string" ? goal : "");
    return NextResponse.json({ roadmap });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: e?.message ?? "Roadmap generation failed" }, { status: 500 });
  }
}
