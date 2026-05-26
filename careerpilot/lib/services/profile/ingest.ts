import { extractText, chunkCv, type Chunk } from "./cv";
import { embedBatch } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase";

export type IngestResult = { fileName: string; chunks: number; sections: string[] };

const MAX_CHARS = 1200;
const OVERLAP = 150;

/**
 * Shared ingestion pipeline — used by both the file-upload route and the
 * in-app CV builder. Replaces ALL prior cv_chunks for the user (never
 * duplicates), then chunks, embeds, and inserts each section's text.
 *
 * @param sections  Array of { section, content } — e.g. "experience",
 *                  "education", "skills", etc. Each content block is
 *                  chunked independently (no cross-section mixing).
 * @param fileName  Optional display name for the cv_documents row.
 */
export async function ingestSections(
  userId: string,
  sections: { section: string; content: string }[],
  fileName = "Built CV",
): Promise<IngestResult> {
  if (!userId || typeof userId !== "string" || userId.length < 8) {
    throw new Error("Invalid user ID");
  }

  const supabase = createAdminClient();

  const { error: profileErr } = await supabase.from("profiles").upsert({ id: userId });
  if (profileErr) {
    throw new Error(`Failed to create profile: ${profileErr.message}`);
  }

  // Delete old data — re-ingest replaces everything
  await supabase.from("cv_chunks").delete().eq("user_id", userId);
  await supabase.from("cv_documents").delete().eq("user_id", userId);

  // Merge all section content for the raw_text column
  const rawText = sections.map((s) => `=== ${s.section.toUpperCase()} ===\n${s.content}`).join("\n\n");

  const { data: doc, error: docErr } = await supabase
    .from("cv_documents")
    .insert({ user_id: userId, file_name: fileName, raw_text: rawText })
    .select("id")
    .single();
  if (docErr) throw docErr;

  // Chunk each section independently (size-based split, no heading detection)
  const allChunks: Chunk[] = [];
  let position = 0;

  for (const { section, content } of sections) {
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + MAX_CHARS, content.length);
      let breakPoint = end;
      if (end < content.length) {
        const nl = content.lastIndexOf("\n", end);
        if (nl > start) breakPoint = nl + 1;
      }
      allChunks.push({
        section,
        content: content.slice(start, breakPoint).trim(),
        position: position++,
      });
      start = breakPoint - OVERLAP;
      if (start < 0) start = breakPoint;
    }
  }

  const embeddings = await embedBatch(allChunks.map((c) => c.content));

  const rows = allChunks.map((c, i) => ({
    user_id: userId,
    document_id: doc.id,
    section: c.section,
    content: c.content,
    position: c.position,
    embedding: embeddings[i],
  }));

  const { error: insErr } = await supabase.from("cv_chunks").insert(rows);
  if (insErr) throw insErr;

  const uniqueSections = [...new Set(allChunks.map((c) => c.section))];
  return { fileName, chunks: allChunks.length, sections: uniqueSections };
}

/** Upload path: extract text from file, chunk by section, then ingest via ingestSections. */
export async function ingestCv(
  userId: string,
  buffer: Buffer,
  fileName: string
): Promise<IngestResult> {
  const text = await extractText(buffer, fileName);
  if (!text.trim()) throw new Error("Could not extract text from file");

  const chunks = chunkCv(text);

  // Group chunks by section and concatenate their text so ingestSections
  // handles the final chunking + embedding + storage uniformly.
  const sectionMap = new Map<string, string[]>();
  for (const c of chunks) {
    const arr = sectionMap.get(c.section) ?? [];
    arr.push(c.content);
    sectionMap.set(c.section, arr);
  }
  const sections = [...sectionMap.entries()].map(([section, contents]) => ({
    section,
    content: contents.join("\n\n"),
  }));

  return ingestSections(userId, sections, fileName);
}
