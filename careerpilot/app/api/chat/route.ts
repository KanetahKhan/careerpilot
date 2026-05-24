import { streamText, type CoreMessage } from "ai";
import { chatModel } from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/rag";
import { supabaseAdmin, DEMO_USER_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: CoreMessage[]; sessionId?: string } =
    await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = typeof lastUser?.content === "string" ? lastUser.content : "";

  // RAG: retrieve the most relevant CV chunks for this question.
  let context = "(No CV uploaded yet.)";
  let retrieved: { section: string; similarity: number }[] = [];
  try {
    const chunks = await retrieveChunks(DEMO_USER_ID, query, 5);
    context = formatContext(chunks);
    retrieved = chunks.map((c) => ({ section: c.section, similarity: c.similarity }));
  } catch {
    /* retrieval is best-effort; assistant still answers honestly */
  }

  const system = `You are CareerPilot's assistant — a sharp, honest career co-pilot.
You are grounded STRICTLY in the user's actual CV, provided below as context.

RULES:
- Base every claim about the user on the CV context. If the context does not
  contain something, say so plainly ("Your CV doesn't mention X") — never invent
  experience, skills, or history.
- When you reference the user's background, cite the section, e.g. "(from your
  Experience section)".
- Be concrete and concise. For roadmaps, give week-by-week structure. For cover
  letters, quote specific real items from the CV.

=== USER CV CONTEXT ===
${context}
=======================`;

  const result = streamText({
    model: chatModel,
    system,
    messages,
    // expose what was retrieved to the client (for the "cited chunks" panel)
    onFinish: async ({ text }) => {
      try {
        const supabase = supabaseAdmin();
        const sid = sessionId ?? "default";
        await supabase.from("chat_messages").insert([
          { user_id: DEMO_USER_ID, session_id: sid, role: "user", content: query },
          { user_id: DEMO_USER_ID, session_id: sid, role: "assistant", content: text },
        ]);
      } catch {
        /* persistence is best-effort */
      }
    },
  });

  return result.toDataStreamResponse({
    headers: { "x-retrieved": Buffer.from(JSON.stringify(retrieved)).toString("base64") },
  });
}
