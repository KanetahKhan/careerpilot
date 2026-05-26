import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { generateObjectWithFallback } from "@/lib/ai";

export type RoleBenchmark = {
  roleTitle: string;
  skills: string[];
};

function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const BenchmarkSchema = z.object({
  skills: z.array(z.string()),
});

async function generateBenchmark(role: string): Promise<RoleBenchmark> {
  const { object } = await generateObjectWithFallback({
    schema: BenchmarkSchema,
    prompt: `You are a career coach. For the role "${role}", return:
- skills: an array of 10-15 concrete technical and domain skills required (lowercase, no duplicates)
Do not include soft skills. Only hard, job-relevant technical skills.`,
    schemaName: "role_benchmark",
    temperature: 0.3,
  });
  return {
    roleTitle: role,
    skills: [...new Set(object.skills.map((s) => s.toLowerCase().trim()))].filter(Boolean),
  };
}

const FALLBACK_BENCHMARK: RoleBenchmark = {
  roleTitle: "software engineer",
  skills: [
    "python", "javascript", "git", "sql", "rest api",
    "data structures", "algorithms", "debugging", "linux", "testing",
  ],
};

/**
 * Resolve a role benchmark by title.
 *
 * Strategy:
 * 1. Normalise the input to a slug (lowercase, hyphens, alphanumeric only).
 * 2. Look up `role_benchmarks` by `role_slug` (ILIKE).
 * 3. On a miss, generate via LLM and cache the result for future requests.
 * 4. On total failure (LLM + DB both down), return a small generic set.
 *
 * Never throws.
 */
export async function getBenchmark(role: string): Promise<RoleBenchmark> {
  const supabase = createAdminClient();
  const slug = toSlug(role);

  // 1. DB lookup
  try {
    const { data } = await supabase
      .from("role_benchmarks")
      .select("role_slug, role_label, skills")
      .ilike("role_slug", slug)
      .maybeSingle();

    if (data) {
      return {
        roleTitle: data.role_label ?? data.role_slug,
        skills: data.skills ?? [],
      };
    }
  } catch {
    // DB down — fall through to LLM
  }

  // 2. LLM generation + cache
  try {
    const benchmark = await generateBenchmark(role);
    await supabase
      .from("role_benchmarks")
      .insert({
        role_slug: slug,
        role_label: role,
        skills: benchmark.skills,
        source: "llm",
      })
      .maybeSingle();
    return benchmark;
  } catch {
    return FALLBACK_BENCHMARK;
  }
}
