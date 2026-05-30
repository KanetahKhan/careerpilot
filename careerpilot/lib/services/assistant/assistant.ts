import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { createAdminClient } from "@/lib/supabase";
import { intentGuidance, type Intent } from "./intent";

export type RetrievedMeta = { section: string; similarity: number };

/** Static system prompt — no dynamic interpolation, enabling Gemini prompt caching. */
export const SYSTEM_PROMPT = `You are CareerPilot's assistant — a sharp, honest career co-pilot.
You are grounded STRICTLY in the user's actual CV, provided below as context.

RULES:
- Base every claim about the user on the CV context. If the context does not
  contain something, say so plainly ("Your CV doesn't mention X") — never invent
  experience, skills, or history.
- When you reference the user's background, cite the section, e.g. "(from your
  Experience section)".
- Be concrete and concise. For roadmaps, give week-by-week structure. For cover
  letters, quote specific real items from the CV.`;

export async function buildGroundedContext(
  userId: string,
  query: string
): Promise<{
  context: string;
  contextMessage: { role: "user"; content: string };
  retrieved: RetrievedMeta[];
}> {
  try {
    const chunks = await retrieveChunks(userId, query, 5);
    const context = formatContext(chunks);
    return {
      context,
      contextMessage: {
        role: "user",
        content: `Here is my CV context:\n${context}`,
      },
      retrieved: chunks.map((c) => ({ section: c.section, similarity: c.similarity })),
    };
  } catch {
    const fallback = "(No CV uploaded yet.)";
    return {
      context: fallback,
      contextMessage: { role: "user", content: `Here is my CV context:\n${fallback}` },
      retrieved: [],
    };
  }
}

export function assistantSystemPrompt(context: string, intent: Intent = "general"): string {
  const guidance = intentGuidance(intent);
  return `${SYSTEM_PROMPT}
${guidance ? `\n${guidance}\n` : ""}
=== USER CV CONTEXT ===
${context}
=======================`;
}

export async function persistTurn(
  userId: string,
  sessionId: string,
  userText: string,
  assistantText: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("chat_messages").insert([
      { user_id: userId, session_id: sessionId, role: "user", content: userText },
      { user_id: userId, session_id: sessionId, role: "assistant", content: assistantText },
    ]);
  } catch {
    /* persistence is best-effort */
  }
}
