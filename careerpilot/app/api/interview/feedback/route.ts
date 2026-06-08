import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { generateObjectWithFallback } from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { route, parseJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  sessionId: z.string().min(1),
  jd: z.string().min(10).max(40_000),
  questions: z
    .array(z.object({ question: z.string(), type: z.string(), rationale: z.string() }))
    .min(1),
  transcript: z
    .array(z.object({ role: z.string(), content: z.string() }))
    .min(1),
});

const FeedbackSchema = z.object({
  overallAssessment: z.string().max(500),
  competencies: z.array(
    z.object({
      competency: z.string().describe("e.g. System Design, React, Communication"),
      score: z.number().min(1).max(5),
      strengths: z.array(z.string()).describe("Strengths grounded in what the candidate actually said"),
      gaps: z.array(z.string()).describe("Areas the candidate didn't evidence or gave weak answers for"),
      suggestion: z.string().max(300),
    }),
  ),
  strongRecommend: z.boolean(),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  await enforceRateLimit(user.id, "interview/feedback", "medium");
  const { jd, questions, transcript } = await parseJson(req, BodySchema);

  const cvContext = await retrieveChunks(user.id, jd, 8);
  const contextStr = formatContext(cvContext);

  const questionList = questions
    .map((q, i) => `Q${i + 1} (${q.type}): ${q.question} (${q.rationale})`)
    .join("\n");

  const interviewLog = transcript
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n\n");

  const { object } = await generateObjectWithFallback({
    schema: FeedbackSchema,
    prompt: `You are a senior hiring manager providing structured interview feedback.

Based on the job description, question plan, and interview transcript below, generate per-competency feedback.

RULES:
- Competencies should reflect both the JD requirements and the types of questions asked.
- Strengths MUST reference specific things the candidate said (quote briefly).
- Gaps should identify unanswered, weak, or avoided topics.
- Score 1-5 (1=weak, 5=exceptional).
- strongRecommend should be true if aggregate impression is positive.
- overallAssessment: 2-4 sentence summary of hire/no-hire stance.

JOB DESCRIPTION:
${jd.slice(0, 4000)}

CANDIDATE CV CONTEXT:
${contextStr}

QUESTION PLAN:
${questionList}

INTERVIEW TRANSCRIPT:
${interviewLog}`,
    schemaName: "interview_feedback",
    temperature: 0.3,
  });

  return NextResponse.json({ feedback: object });
});
