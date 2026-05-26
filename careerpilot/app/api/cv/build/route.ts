import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestSections, getCvProfile } from "@/lib/services/profile";
import { serializeBuilderCv, parseBuilderFromSections } from "@/lib/cv-transform";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const BuilderSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  experience: z.array(
    z.object({
      title: z.string().min(1),
      company: z.string().min(1),
      start: z.string().optional(),
      end: z.string().optional(),
      bullets: z.array(z.string()).default([]),
    }),
  ).default([]),
  education: z.array(
    z.object({
      degree: z.string().min(1),
      institution: z.string().min(1),
      start: z.string().optional(),
      end: z.string().optional(),
      details: z.string().optional(),
    }),
  ).default([]),
  projects: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().default(""),
      tech: z.array(z.string()).optional(),
    }),
  ).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).optional(),
  extracurricular: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const parsed = BuilderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const sections = serializeBuilderCv(parsed.data);
    const result = await ingestSections(user.id, sections, "Built CV");
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: e?.message ?? "Build failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getCvProfile(user.id);
    if (!profile || !profile.sections || profile.totalChunks === 0) {
      return NextResponse.json(null);
    }
    const builder = parseBuilderFromSections(profile.sections);
    return NextResponse.json(builder);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load CV" }, { status: 500 });
  }
}
