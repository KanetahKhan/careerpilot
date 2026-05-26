import { type CoreMessage } from "ai";
import { streamTextWithFallback } from "@/lib/ai";
import {
  buildGroundedContext,
  assistantSystemPrompt,
  persistTurn,
  classifyIntent,
} from "@/lib/services/assistant";
import { requireUser } from "@/lib/auth";
import { getBenchmark } from "@/lib/services/profile/benchmarks";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Naive role extraction: look for a phrase after "for (a|an)" or "as (a|an)". */
function extractRole(query: string): string | null {
  const m = query.match(/(?:for|as)\s+(?:a\s+)?(?:an\s+)?(.+?)(?:\.|,|$|\s+(?:role|position|internship|job))/i);
  return m ? m[1].trim() : null;
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { messages, sessionId }: { messages: CoreMessage[]; sessionId?: string } =
    await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";

  const [intent, { context, retrieved }] = await Promise.all([
    classifyIntent(query),
    buildGroundedContext(user.id, query),
  ]);

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
        }
      } catch {
        // best-effort — assistant still answers without benchmark context
      }
    }
  }

  return streamTextWithFallback({
    system: assistantSystemPrompt(enrichedContext, intent),
    messages,
    onFinish: (text) => persistTurn(user.id, sessionId ?? "default", query, text),
    headers: {
      "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64"),
      "x-intent": intent,
    },
  });
}
