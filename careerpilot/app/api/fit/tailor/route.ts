import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  AI_BUSY_MESSAGE,
  generateObjectWithFallback,
  isRateLimitError,
} from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  jd: z.string().min(20).max(20_000),
  location: z.string().max(200).optional(),
});

const TailorSchema = z.object({
  rewrites: z
    .array(
      z.object({
        original: z
          .string()
          .describe("the exact line/phrase from the user's CV chunks being tailored"),
        suggested: z
          .string()
          .describe("the rewritten bullet — same facts, reframed/quantified for this JD"),
        why: z
          .string()
          .describe("one short sentence: why this rewrite fits the job, citing the CV section"),
      })
    )
    .max(6),
  gaps: z
    .array(z.string())
    .describe("things the JD asks for that genuinely do NOT appear in the CV chunks")
    .max(8),
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
        { status: 400 }
      );
    }

    const { jd } = parsed.data;
    const chunks = await retrieveChunks(user.id, jd, 6);
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No CV content found — upload your CV first." },
        { status: 400 }
      );
    }

    const cvContext = formatContext(chunks);

    const { object } = await generateObjectWithFallback({
      schema: TailorSchema,
      prompt: `You are CareerPilot's CV tailor. Rewrite up to 6 bullet points from THIS USER'S CV to better
match the job description, AND list any honest gaps separately.

HARD RULES — NEVER VIOLATE:
1. You may ONLY rephrase, reframe, or quantify experience that explicitly appears in the CV chunks below.
2. If the JD asks for something that is NOT in the chunks, do NOT invent it. Put it in "gaps" instead.
3. Every "original" string MUST be a real line or phrase from the retrieved chunks — copy faithfully.
4. Every "suggested" must remain truthful about the user's actual work — same facts, sharper framing.
5. In "why", cite the section (e.g. "from Experience"), and explain the JD alignment in one sentence.
6. If the chunks contain nothing relevant, return an empty rewrites[] and put the asks under gaps[].

=== JOB DESCRIPTION ===
${jd.slice(0, 8000)}
=======================

=== USER CV CHUNKS (the only source of truth) ===
${cvContext}
==================================================`,
    });

    return NextResponse.json({
      rewrites: object.rewrites,
      gaps: object.gaps,
      citedSections: [...new Set(chunks.map((c) => c.section))],
    });
  } catch (e: unknown) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}
