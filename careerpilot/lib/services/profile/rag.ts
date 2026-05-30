import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase";
import { embedText } from "@/lib/ai";

export type RetrievedChunk = {
  id: number;
  section: string;
  content: string;
  similarity: number;
};

const CACHE_TTL_MS = 300_000; // 5 minutes

/**
 * The RAG retrieval step: embed a query, then pull the top-k most similar
 * CV chunks for this user via the match_cv_chunks RPC.
 *
 * Results are cached per (user_id, query_hash) for 5 minutes to avoid
 * redundant embedding + vector calls when the user rapidly repeats a
 * question or browses related suggestions.
 */
export async function retrieveChunks(
  userId: string,
  query: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const normalized = query.toLowerCase().trim();
  const queryHash = createHash("sha256").update(normalized, "utf-8").digest("hex");

  const supabase = createAdminClient();

  // Check cache
  const { data: cached } = await supabase
    .from("rag_query_cache")
    .select("results, created_at")
    .eq("user_id", userId)
    .eq("query_hash", queryHash)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime();
    if (age < CACHE_TTL_MS) {
      return cached.results as RetrievedChunk[];
    }
  }

  // Cache miss — compute fresh
  const queryEmbedding = await embedText(normalized);
  const { data, error } = await supabase.rpc("match_cv_chunks", {
    p_user_id: userId,
    query_embedding: queryEmbedding,
    match_count: k,
  });
  if (error) throw new Error(`Retrieval failed: ${error.message}`);

  const results = (data ?? []) as RetrievedChunk[];

  // Upsert cache entry (best-effort — retrieval still succeeds if this fails)
  await supabase.from("rag_query_cache").upsert(
    { user_id: userId, query_hash: queryHash, results: JSON.parse(JSON.stringify(results)) },
    { onConflict: "user_id, query_hash" }
  );

  return results;
}

/** Format retrieved chunks into a context block for the system prompt. */
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(No CV content available for this user yet.)";
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (section: ${c.section}, relevance: ${c.similarity.toFixed(2)})\n${c.content}`
    )
    .join("\n\n");
}
