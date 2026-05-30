import { type CoreMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AI_BUSY_MESSAGE, isRateLimitError, streamTextWithFallback } from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { persistTurn } from "@/lib/services/assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  sessionId: z.string().min(1),
  jd: z.string().min(10).max(40_000),
  questions: z
    .array(z.object({ question: z.string(), type: z.string(), rationale: z.string() }))
    .min(1)
    .max(10),
  // May be empty on the opening turn — the interviewer asks Q1 before the
  // candidate has said anything. We seed a kickoff message below in that case.
  messages: z.array(z.any()),
});

function buildSystemPrompt(jd: string, cvContext: string, questions: string): string {
  return `You are a senior hiring manager conducting a live interview for the role described below.

YOUR JOB:
- Ask the questions from the plan one at a time. Wait for the candidate's answer before moving on.
- After each answer, give a brief, natural reaction (1-2 sentences max) — be encouraging but honest.
- If the candidate's answer is vague, ask ONE follow-up to clarify. Otherwise move to the next question.
- Stay in interviewer character. Do NOT evaluate or score during the interview.

CANDIDATE CV CONTEXT:
${cvContext}

INTERVIEW QUESTION PLAN:
${questions}

JOB DESCRIPTION:
${jd.slice(0, 3000)}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { sessionId, jd, questions, messages } = parsed.data;

    const cvContext = await retrieveChunks(user.id, jd, 8);
    const contextStr = formatContext(cvContext);
    const questionPlan = questions
      .map((q, i) => `Q${i + 1} (${q.type}): ${q.question}`)
      .join("\n");

    const system = buildSystemPrompt(jd, contextStr, questionPlan);

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const userText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

    // The model needs at least one turn to respond to. On the opening turn the
    // candidate hasn't spoken yet, so seed a kickoff so the interviewer asks Q1.
    const convo: CoreMessage[] =
      messages.length > 0
        ? (messages as CoreMessage[])
        : [{ role: "user", content: "Please begin the interview and ask me the first question." }];

    return streamTextWithFallback({
      system,
      messages: convo,
      onFinish: (text) => persistTurn(user.id, sessionId, userText, text),
      abortSignal: req.signal,
    });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: e?.message ?? "Interview turn failed" }, { status: 500 });
  }
}
