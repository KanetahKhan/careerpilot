import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { generateObjectWithFallback } from "@/lib/ai";

export type RoleBenchmark = {
  roleTitle: string;
  skills: string[];
  seniorityYears: number;
  educationLevel: string | null;
  commonTools: string[];
};

const BenchmarkSchema = z.object({
  skills: z.array(z.string()),
  seniorityYears: z.number(),
  educationLevel: z.string(),
  commonTools: z.array(z.string()),
});

async function generateBenchmark(role: string): Promise<RoleBenchmark> {
  const { object } = await generateObjectWithFallback({
    schema: BenchmarkSchema,
    prompt: `You are a career coach. For the role "${role}", return:
- skills: an array of 10-15 concrete technical and domain skills required (lowercase)
- seniorityYears: typical years of experience expected
- educationLevel: typical degree level ("bachelor's", "master's", "phd", or empty string)
- commonTools: an array of 5-8 most common tools/frameworks (lowercase)`,
    schemaName: "role_benchmark",
    temperature: 0.3,
  });
  return {
    roleTitle: role,
    skills: object.skills,
    seniorityYears: object.seniorityYears,
    educationLevel: object.educationLevel || null,
    commonTools: object.commonTools,
  };
}

/**
 * Resolve a role benchmark by title.
 *
 * Strategy:
 * 1. Look up the `role_benchmarks` table (seeded + previously cached rows).
 * 2. If not found, generate via LLM and cache the result for future requests.
 *
 * The seed covers ~10 common roles; any other role triggers a one-time LLM
 * call whose output is persisted so subsequent lookups are instant.
 */
export async function getBenchmark(role: string): Promise<RoleBenchmark> {
  const supabase = createAdminClient();
  const normalized = role.toLowerCase().trim().replace(/\s+/g, " ");

  // 1. DB lookup
  const { data } = await supabase
    .from("role_benchmarks")
    .select("*")
    .ilike("role_title", normalized)
    .maybeSingle();

  if (data) {
    return {
      roleTitle: data.role_title,
      skills: data.skills ?? [],
      seniorityYears: data.seniority_years ?? 0,
      educationLevel: data.education_level ?? null,
      commonTools: data.common_tools ?? [],
    };
  }

  // 2. LLM generation + cache
  const benchmark = await generateBenchmark(normalized);
  await supabase
    .from("role_benchmarks")
    .insert({
      role_title: normalized,
      skills: benchmark.skills,
      seniority_years: benchmark.seniorityYears,
      education_level: benchmark.educationLevel,
      common_tools: benchmark.commonTools,
      source: "llm",
    })
    .maybeSingle();

  return benchmark;
}
