import { z } from "zod";
import { type CoreMessage } from "ai";
import { streamTextWithFallback } from "@/lib/ai";
import {
  buildGroundedContext,
  SYSTEM_PROMPT,
  persistTurn,
  classifyIntent,
  intentGuidance,
} from "@/lib/services/assistant";
import { requireUser } from "@/lib/auth";
import { getBenchmark } from "@/lib/services/profile/benchmarks";
import { route, parseJson } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.any() })).min(1),
  sessionId: z.string().optional(),
});

/** Naive role extraction: look for a phrase after "for (a|an)" or "as (a|an)". */
function extractRole(query: string): string | null {
  const m = query.match(/(?:for|as)\s+(?:a\s+)?(?:an\s+)?(.+?)(?:\.|,|$|\s+(?:role|position|internship|job))/i);
  return m ? m[1].trim() : null;
}

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { messages, sessionId } = await parseJson(req, BodySchema);
  const abortSignal = req.signal;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";

  const [intent, grounded] = await Promise.all([
    classifyIntent(query),
    buildGroundedContext(user.id, query),
  ]);

  const { context, contextMessage, retrieved } = grounded;
  const guidance = intentGuidance(intent);

  // When the intent is skill_gap and a role is named, fetch benchmark context
  // so the assistant's answer and the /skill-gap page agree.
  let enrichedContext = context;
  if (intent === "skill_gap") {
    const role = extractRole(query);
    if (role) {
      try {
        const bm = await getBenchmark(role);
        if (bm.skills.length > 0) {
          enrichedContext =
            `${context}\n\n=== ROLE BENCHMARK: ${bm.roleTitle} ===\nExpected skills: ${bm.skills.join(", ")}\n=========================`;
          contextMessage.content = `Here is my CV context:\n${enrichedContext}`;
        }
      } catch {
        // best-effort — assistant still answers without benchmark context
      }
    }
  }

  return streamTextWithFallback({
    system: guidance ? `${SYSTEM_PROMPT}\n\n${guidance}` : SYSTEM_PROMPT,
    messages: [contextMessage, ...(messages as CoreMessage[])],
    onFinish: (text) => persistTurn(user.id, sessionId ?? "default", query, text),
    abortSignal,
    headers: {
      "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64"),
      "x-intent": intent,
    },
  });
});
