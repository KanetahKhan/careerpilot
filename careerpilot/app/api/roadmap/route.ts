import { NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/services/assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Thin controller: produce a structured, CV-grounded roadmap for a goal. */
export async function POST(req: Request) {
  try {
    const { goal } = await req.json();
    const roadmap = await generateRoadmap(typeof goal === "string" ? goal : "");
    return NextResponse.json({ roadmap });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Roadmap generation failed" }, { status: 500 });
  }
}
