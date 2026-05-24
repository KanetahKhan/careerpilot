import { streamText, type CoreMessage } from "ai";
import { chatModel, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import {
  buildGroundedContext,
  assistantSystemPrompt,
  persistTurn,
  classifyIntent,
} from "@/lib/services/assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Thin controller: delegate RAG grounding + prompt + persistence to the
 * assistant service; the route owns only the streaming wiring.
 */
export async function POST(req: Request) {
  const { messages, sessionId }: { messages: CoreMessage[]; sessionId?: string } =
    await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";

  // Intent routing + RAG retrieval (run together — both depend only on the query).
  const [intent, { context, retrieved }] = await Promise.all([
    classifyIntent(query),
    buildGroundedContext(query),
  ]);

  const result = streamText({
    model: chatModel,
    system: assistantSystemPrompt(context, intent),
    messages,
    onFinish: async ({ text }) => {
      await persistTurn(sessionId ?? "default", query, text);
    },
  });

  return result.toDataStreamResponse({
    headers: {
      // expose what was retrieved + the detected intent to the client
      "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64"),
      "x-intent": intent,
    },
    // Surface a calm message (esp. on rate limits) instead of a raw stack trace.
    getErrorMessage: (error) =>
      isRateLimitError(error) ? AI_BUSY_MESSAGE : "Something went wrong — please try again.",
  });
}
