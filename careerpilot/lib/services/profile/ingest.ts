import { extractText, chunkCv } from "./cv";
import { embedBatch } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase";

export type IngestResult = { fileName: string; chunks: number; sections: string[] };

export async function ingestCv(
  userId: string,
  buffer: Buffer,
  fileName: string
): Promise<IngestResult> {
  if (!userId || typeof userId !== "string" || userId.length < 8) {
    throw new Error("Invalid user ID — cannot upload CV without a valid authenticated user");
  }

  const text = await extractText(buffer, fileName);
  if (!text.trim()) throw new Error("Could not extract text from file");

  const chunks = chunkCv(text);
  const embeddings = await embedBatch(chunks.map((c) => c.content));

  const supabase = createAdminClient();

  // Ensure the user has a profile row so the FK on cv_documents/user_id is valid.
  // This is idempotent and safe to call even if an auth trigger already creates profiles.
  const { error: profileErr } = await supabase.from("profiles").upsert({ id: userId });
  if (profileErr) {
    throw new Error(`Failed to create profile for user ${userId}: ${profileErr.message}`);
  }

  await supabase.from("cv_chunks").delete().eq("user_id", userId);
  await supabase.from("cv_documents").delete().eq("user_id", userId);

  const { data: doc, error: docErr } = await supabase
    .from("cv_documents")
    .insert({ user_id: userId, file_name: fileName, raw_text: text })
    .select("id")
    .single();
  if (docErr) throw docErr;

  const rows = chunks.map((c, i) => ({
    user_id: userId,
    document_id: doc.id,
    section: c.section,
    content: c.content,
    position: c.position,
    embedding: embeddings[i],
  }));
  const { error: insErr } = await supabase.from("cv_chunks").insert(rows);
  if (insErr) throw insErr;

  const sections = [...new Set(chunks.map((c) => c.section))];
  return { fileName, chunks: chunks.length, sections };
}
