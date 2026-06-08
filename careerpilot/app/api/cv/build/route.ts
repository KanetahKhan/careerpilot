import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestSections, getCvProfile } from "@/lib/services/profile";
import { serializeBuilderCv, parseBuilderFromSections } from "@/lib/cv-transform";
import { requireUser } from "@/lib/auth";
import { route, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

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
      githubUrl: z.string().optional(),
      liveUrl: z.string().optional(),
    }),
  ).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).optional(),
  extracurricular: z.array(z.string()).optional(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  await enforceRateLimit(user.id, "cv/build", "heavy");
  const raw = await req.json().catch(() => null);
  const parsed = BuilderSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(parsed.error.errors[0]?.message ?? "Validation failed", 400);
  const sections = serializeBuilderCv(parsed.data);
  const result = await ingestSections(user.id, sections, "Built CV");
  return NextResponse.json({ ok: true, ...result });
});

export const GET = route(async () => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const profile = await getCvProfile(user.id);
  if (!profile || !profile.sections || profile.totalChunks === 0) {
    return NextResponse.json(null);
  }
  const builder = parseBuilderFromSections(profile.sections);
  return NextResponse.json(builder);
});
