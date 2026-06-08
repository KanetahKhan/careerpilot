import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { generateObjectWithFallback } from "@/lib/ai";
import { getOnetBenchmark } from "@/lib/services/onet/onet-client";

export type BenchmarkSource = "seed" | "onet" | "llm" | "fallback";

export type RoleBenchmark = {
  roleTitle: string;
  skills: string[];
  source: BenchmarkSource;
  soc?: string;
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

async function generateBenchmark(role: string): Promise<{ roleTitle: string; skills: string[] }> {
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
  source: "fallback",
};

/**
 * Resolve a role benchmark by title.
 *
 * Strategy (tiered, each tier falls through on miss/failure):
 * 1. Supabase `role_benchmarks` cache — returns the row's stored `source`
 *    (seed | onet | llm).
 * 2. O*NET Web Services — authoritative US-DoL taxonomy. Skipped silently
 *    if `ONET_API_KEY` is unset or the role doesn't map cleanly. Cached on
 *    success with `source='onet'`.
 * 3. LLM generation — Gemini invents a skill list and caches it
 *    (`source='llm'`).
 * 4. Hardcoded `FALLBACK_BENCHMARK` (`source='fallback'`).
 *
 * Never throws.
 */
export async function getBenchmark(role: string): Promise<RoleBenchmark> {
  const supabase = createAdminClient();
  const slug = toSlug(role);

  // 1. DB cache lookup
  try {
    const { data } = await supabase
      .from("role_benchmarks")
      .select("role_slug, role_label, skills, source, onet_soc")
      .ilike("role_slug", slug)
      .maybeSingle();

    if (data) {
      return {
        roleTitle: data.role_label ?? data.role_slug,
        skills: data.skills ?? [],
        source: (data.source as BenchmarkSource) ?? "seed",
        soc: data.onet_soc ?? undefined,
      };
    }
  } catch {
    // DB down — fall through.
  }

  // 2. O*NET (authoritative taxonomy) — primary source for non-seeded roles.
  try {
    const onet = await getOnetBenchmark(role);
    if (onet) {
      await supabase
        .from("role_benchmarks")
        .upsert(
          {
            role_slug: slug,
            role_label: onet.roleTitle,
            skills: onet.skills,
            source: "onet",
            onet_soc: onet.soc,
            onet_title: onet.roleTitle,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "role_slug" },
        )
        .maybeSingle();
      return {
        roleTitle: onet.roleTitle,
        skills: onet.skills,
        source: "onet",
        soc: onet.soc,
      };
    }
  } catch {
    // O*NET unreachable or DB write failed — fall through to LLM.
  }

  // 3. LLM generation + cache.
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
    return {
      roleTitle: benchmark.roleTitle,
      skills: benchmark.skills,
      source: "llm",
    };
  } catch {
    return FALLBACK_BENCHMARK;
  }
}
