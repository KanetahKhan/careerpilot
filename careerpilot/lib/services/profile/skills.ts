import { generateObjectWithFallback } from "@/lib/ai";
import { z } from "zod";
import { createHash } from "crypto";

// Simple in-memory LRU cache keyed by text hash — avoids re-extracting
// skills from the same CV/job-description text within a short window.
const skillCache = new Map<string, { skills: string[]; ts: number }>();
const SKILL_CACHE_MAX = 50;
const SKILL_CACHE_TTL = 5 * 60_000; // 5 minutes

function skillCacheKey(text: string, label: string): string {
  return createHash("sha256").update(`${label}::${text}`).digest("hex").slice(0, 16);
}

export async function extractSkills(text: string, label: string): Promise<string[]> {
  const key = skillCacheKey(text, label);
  const cached = skillCache.get(key);
  if (cached && Date.now() - cached.ts < SKILL_CACHE_TTL) {
    return cached.skills;
  }

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({ skills: z.array(z.string()) }),
      prompt: `Extract a flat list of concrete technical skills, tools, languages, and frameworks mentioned in the following ${label}. Return lowercase, deduplicated, no soft skills.\n\n${text.slice(0, 6000)}`,
    });
    const skills = [...new Set(object.skills.map((s) => s.toLowerCase().trim()))].filter(Boolean);

    if (skillCache.size >= SKILL_CACHE_MAX) {
      const oldest = [...skillCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) skillCache.delete(oldest[0]);
    }
    skillCache.set(key, { skills, ts: Date.now() });

    return skills;
  } catch {
    return [];
  }
}
