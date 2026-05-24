import { streamText, type CoreMessage } from "ai";
import { chatModel } from "@/lib/ai";
import {
  buildGroundedContext,
  assistantSystemPrompt,
  persistTurn,
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

  // RAG: retrieve the most relevant CV chunks for this question.
  const { context, retrieved } = await buildGroundedContext(query);

  const result = streamText({
    model: chatModel,
    system: assistantSystemPrompt(context),
    messages,
    onFinish: async ({ text }) => {
      await persistTurn(sessionId ?? "default", query, text);
    },
  });

  return result.toDataStreamResponse({
    // expose what was retrieved to the client (for the "cited chunks" panel)
    headers: { "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64") },
  });
}
