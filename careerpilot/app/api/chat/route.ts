import { type CoreMessage } from "ai";
import { streamTextWithFallback } from "@/lib/ai";
import {
  buildGroundedContext,
  assistantSystemPrompt,
  persistTurn,
  classifyIntent,
} from "@/lib/services/assistant";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  return streamTextWithFallback({
    system: assistantSystemPrompt(context, intent),
    messages,
    onFinish: (text) => persistTurn(user.id, sessionId ?? "default", query, text),
    headers: {
      "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64"),
      "x-intent": intent,
    },
  });
}
