import { createHash } from "node:crypto";
import { extractText, chunkCv, type Chunk } from "./cv";
import { embedBatch } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase";

export type IngestResult = { fileName: string; chunks: number; sections: string[] };

const MAX_CHARS = 1200;
const OVERLAP = 150;

/** SHA-256 hex digest of a string. */
function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

/** Component-wise mean of a list of equal-length vectors. */
export function computeCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const out = new Array(dim).fill(0);
  for (const v of embeddings) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= embeddings.length;
  return out;
}

/**
 * Embed texts with an on-disk cache keyed by SHA-256 hash.
 *
 * - For texts whose hash exists in `embedding_cache`, reuses the stored vector.
 * - For cache misses, calls `embedMany` via the Gemini API and stores results.
 * - Returns embeddings in the same order as the input `texts` array.
 */
async function embedBatchWithCache(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const supabase = createAdminClient();

  // 1. Compute hashes
  const hashes = texts.map((t) => contentHash(t));

  // 2. Query cache for hits
  const { data: cached } = await supabase
    .from("embedding_cache")
    .select("hash, vector")
    .in("hash", hashes);

  const cacheMap = new Map<string, number[]>();
  if (cached) {
    for (const row of cached as { hash: string; vector: number[] }[]) {
      cacheMap.set(row.hash, row.vector);
    }
  }

  // 3. Separate hits and misses
  const results: number[][] = [];
  const missedTexts: string[] = [];
  const missedIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    const vec = cacheMap.get(hashes[i]);
    if (vec) {
      results[i] = vec;
    } else {
      missedTexts.push(texts[i]);
      missedIndices.push(i);
    }
  }

  // 4. Embed cache misses (small batches to avoid heap exhaustion)
  if (missedTexts.length > 0) {
    const BATCH_SIZE = 5;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < missedTexts.length; i += BATCH_SIZE) {
      const batch = missedTexts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await embedBatch(batch);
      allEmbeddings.push(...batchEmbeddings);
      if (i + BATCH_SIZE < missedTexts.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Build rows for insertion
    const cacheRows: { hash: string; vector: number[] }[] = [];
    let embIdx = 0;
    for (let j = 0; j < missedTexts.length; j++) {
      const idx = missedIndices[j];
      const vec = allEmbeddings[embIdx++];
      results[idx] = vec;
      cacheRows.push({ hash: hashes[idx], vector: vec });
    }

    // 5. Persist new cache entries (best-effort — misses still work for this request)
    if (cacheRows.length > 0) {
      await supabase.from("embedding_cache").upsert(cacheRows, { onConflict: "hash" });
    }
  }

  return results;
}

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

  // Merge all section content for the raw_text column
  const rawText = sections.map((s) => `=== ${s.section.toUpperCase()} ===\n${s.content}`).join("\n\n");

  // 1. Insert new document first
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

  const embeddings = await embedBatchWithCache(allChunks.map((c) => c.content));

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

  // 2. Only after successful insert, delete old data for this user
  await supabase
    .from("cv_chunks")
    .delete()
    .eq("user_id", userId)
    .neq("document_id", doc.id);

  await supabase
    .from("cv_documents")
    .delete()
    .eq("user_id", userId)
    .neq("id", doc.id);

  // Store centroid for fast fit-score lookups
  const centroid = computeCentroid(embeddings);
  await supabase
    .from("cv_documents")
    .update({ centroid_embedding: centroid })
    .eq("id", doc.id);

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
