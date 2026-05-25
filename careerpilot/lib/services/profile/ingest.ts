import { extractText, chunkCv } from "./cv";
import { embedBatch } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase";

export type IngestResult = { fileName: string; chunks: number; sections: string[] };

export async function ingestCv(
  userId: string,
  buffer: Buffer,
  fileName: string
): Promise<IngestResult> {
  const text = await extractText(buffer, fileName);
  if (!text.trim()) throw new Error("Could not extract text from file");

  const chunks = chunkCv(text);
  const embeddings = await embedBatch(chunks.map((c) => c.content));

  const supabase = createAdminClient();

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
