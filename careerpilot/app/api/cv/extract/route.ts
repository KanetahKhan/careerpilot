import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { generateObjectWithFallback } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const ExtractedProfileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        duration: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string().optional(),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        technologies: z.array(z.string()).optional(),
        githubUrl: z.string().url().optional().or(z.literal("")),
        liveUrl: z.string().url().optional().or(z.literal("")),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "No CV text provided" }, { status: 400 });
    }

    const truncatedText = text.slice(0, 12000);

    const { object } = await generateObjectWithFallback({
      schema: ExtractedProfileSchema,
      system: `You are a precise CV parser. Extract structured information from the CV text.
Rules:
- Extract ONLY what is explicitly stated in the CV. Do NOT hallucinate.
- For projects, extract GitHub/demo URLs ONLY if they appear explicitly in the text (e.g., "github.com/user/repo" or "live at example.com"). If not present, return empty string "".
- Return empty arrays [] or omit fields if not found.
- Be concise.`,
      prompt: `Parse this CV into structured JSON:\n\n${truncatedText}`,
    });

    return Response.json({ extracted: object, rawTextPreview: truncatedText.slice(0, 500) });
  } catch (err) {
    console.error("CV extraction error:", err);
    return Response.json({ error: "Failed to extract CV data" }, { status: 500 });
  }
}
