import { streamText, type CoreMessage } from "ai";
import { chatModel, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
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

  const result = streamText({
    model: chatModel,
    system: assistantSystemPrompt(context, intent),
    messages,
    onFinish: async ({ text }) => {
      await persistTurn(user.id, sessionId ?? "default", query, text);
    },
  });

  return result.toDataStreamResponse({
    headers: {
      "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64"),
      "x-intent": intent,
    },
    getErrorMessage: (error) =>
      isRateLimitError(error) ? AI_BUSY_MESSAGE : "Something went wrong — please try again.",
  });
}
