import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { createAdminClient } from "@/lib/supabase";
import { intentGuidance, type Intent } from "./intent";

export type RetrievedMeta = { section: string; similarity: number };

export async function buildGroundedContext(
  userId: string,
  query: string
): Promise<{ context: string; retrieved: RetrievedMeta[] }> {
  try {
    const chunks = await retrieveChunks(userId, query, 5);
    return {
      context: formatContext(chunks),
      retrieved: chunks.map((c) => ({ section: c.section, similarity: c.similarity })),
    };
  } catch {
    return { context: "(No CV uploaded yet.)", retrieved: [] };
  }
}

export function assistantSystemPrompt(context: string, intent: Intent = "general"): string {
  const guidance = intentGuidance(intent);
  return `You are CareerPilot's assistant — a sharp, honest career co-pilot.
You are grounded STRICTLY in the user's actual CV, provided below as context.

RULES:
- Base every claim about the user on the CV context. If the context does not
  contain something, say so plainly ("Your CV doesn't mention X") — never invent
  experience, skills, or history.
- When you reference the user's background, cite the section, e.g. "(from your
  Experience section)".
- Be concrete and concise. For roadmaps, give week-by-week structure. For cover
  letters, quote specific real items from the CV.
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
