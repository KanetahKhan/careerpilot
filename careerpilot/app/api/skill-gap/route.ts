import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { loadCvContext } from "@/lib/services/fit-score/fit-score";
import { getBenchmark } from "@/lib/services/profile/benchmarks";
import { route, parseJson, ApiError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  role: z.string().min(1).max(200),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { role } = await parseJson(req, BodySchema);

  const cv = await loadCvContext(user.id);
  if (cv.text.trim().length === 0) {
    throw new ApiError(
      "Upload your CV first so we can compare your skills against the role benchmark.",
      400,
    );
  }

  const benchmark = await getBenchmark(role);

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
    source: benchmark.source,
    soc: benchmark.soc,
  });
});
