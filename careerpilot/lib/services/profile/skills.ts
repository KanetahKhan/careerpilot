import { generateObjectWithFallback } from "@/lib/ai";
import { z } from "zod";

export async function extractSkills(text: string, label: string): Promise<string[]> {
  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({ skills: z.array(z.string()) }),
      prompt: `Extract a flat list of concrete technical skills, tools, languages, and frameworks mentioned in the following ${label}. Return lowercase, deduplicated, no soft skills.\n\n${text.slice(0, 6000)}`,
    });
    return [...new Set(object.skills.map((s) => s.toLowerCase().trim()))].filter(Boolean);
  } catch {
    return [];
  }
}
