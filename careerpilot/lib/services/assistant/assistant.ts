import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { supabaseAdmin, DEMO_USER_ID } from "@/lib/supabase";
import { intentGuidance, type Intent } from "./intent";

export type RetrievedMeta = { section: string; similarity: number };

/**
 * Retrieve the user's most relevant CV chunks and format them for grounding.
 * Retrieval is best-effort: if it fails (no CV yet, rate limit) the assistant
 * still answers honestly with an empty context.
 */
export async function buildGroundedContext(
  query: string
): Promise<{ context: string; retrieved: RetrievedMeta[] }> {
  try {
    const chunks = await retrieveChunks(DEMO_USER_ID, query, 5);
    return {
      context: formatContext(chunks),
      retrieved: chunks.map((c) => ({ section: c.section, similarity: c.similarity })),
    };
  } catch {
    return { context: "(No CV uploaded yet.)", retrieved: [] };
  }
}

/**
 * The CV-grounded system prompt. The "say so if it's not in the CV" anti-
 * hallucination rule and the cite-the-section rule live here. When an `intent`
 * is supplied, per-intent formatting guidance is appended so the answer shape
 * adapts (readiness verdict, gap list, week-by-week roadmap, cover letter).
 */
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

/** Best-effort persistence of a chat turn (session memory). */
export async function persistTurn(
  sessionId: string,
  userText: string,
  assistantText: string
): Promise<void> {
  try {
    const supabase = supabaseAdmin();
    await supabase.from("chat_messages").insert([
      { user_id: DEMO_USER_ID, session_id: sessionId, role: "user", content: userText },
      { user_id: DEMO_USER_ID, session_id: sessionId, role: "assistant", content: assistantText },
    ]);
  } catch {
    /* persistence is best-effort */
  }
}
