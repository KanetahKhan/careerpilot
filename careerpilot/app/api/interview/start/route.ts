import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AI_BUSY_MESSAGE, isRateLimitError, generateObjectWithFallback } from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  jd: z.string().min(10).max(40_000),
});

const QuestionsSchema = z.object({
  role: z.string().describe("The target role extracted from the job description"),
  questions: z
    .array(
      z.object({
        question: z.string(),
        type: z.enum(["behavioral", "role-specific", "gap-probing"]),
        rationale: z.string().describe("Why this question is relevant given the candidate's CV context"),
      }),
    )
    .length(5),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide a job description (min 10 chars)" }, { status: 400 });
    }

    const cvContext = await retrieveChunks(user.id, parsed.data.jd, 8);
    const contextStr = formatContext(cvContext);

    const { object } = await generateObjectWithFallback({
      schema: QuestionsSchema,
      prompt: `You are a technical interviewer. Based on the job description below and the candidate's CV context, generate exactly 5 interview questions.

RULES:
- Mix types: at least 1 behavioral, 2 role-specific, 1 gap-probing (something the CV context doesn't fully cover).
- Each question must be tailored to BOTH the job description AND what the candidate's CV shows or doesn't show.
- role-specific questions should reference specific tech/domain from the JD.
- gap-probing questions should address skills the JD requires but the CV doesn't clearly evidence.
- Extract the target role title from the JD.

JOB DESCRIPTION:
${parsed.data.jd.slice(0, 6000)}

CANDIDATE CV CONTEXT:
${contextStr}`,
      schemaName: "interview_questions",
      temperature: 0.4,
    });

    const sessionId = `interview:${crypto.randomUUID()}`;

    return NextResponse.json({
      sessionId,
      role: object.role,
      questions: object.questions,
    });
  } catch (e: unknown) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
