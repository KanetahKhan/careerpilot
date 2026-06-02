import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { loadCvContext } from "@/lib/services/fit-score/fit-score";
import { getBenchmark } from "@/lib/services/profile/benchmarks";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  role: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const cv = await loadCvContext(user.id);
    if (cv.text.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Upload your CV first so we can compare your skills against the role benchmark.",
        },
        { status: 400 },
      );
    }

    const benchmark = await getBenchmark(parsed.data.role);

    const cvSkillsLower = new Set([...cv.skills].map((s) => s.toLowerCase().trim()));
    const benchmarkSkillsLower = benchmark.skills.map((s) => s.toLowerCase().trim());

    const have = benchmarkSkillsLower.filter((s) => cvSkillsLower.has(s));
    const missing = benchmarkSkillsLower.filter((s) => !cvSkillsLower.has(s));

    const coverage =
      benchmarkSkillsLower.length === 0
        ? 0
        : Math.round((have.length / benchmarkSkillsLower.length) * 100);

    return NextResponse.json({
      role: benchmark.roleTitle,
      coverage,
      benchmarkSkills: benchmark.skills,
      have,
      missing,
    });
  } catch (e: unknown) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: getErrorMessage(e) },
      { status: 500 },
    );
  }
}
