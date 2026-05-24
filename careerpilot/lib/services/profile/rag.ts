import { supabaseAdmin } from "@/lib/supabase";
import { embedText } from "@/lib/ai";

export type RetrievedChunk = {
  id: number;
  section: string;
  content: string;
  similarity: number;
};

/**
 * The RAG retrieval step: embed a query, then pull the top-k most similar
 * CV chunks for this user via the match_cv_chunks RPC.
 */
export async function retrieveChunks(
  userId: string,
  query: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("match_cv_chunks", {
    p_user_id: userId,
    query_embedding: queryEmbedding,
    match_count: k,
  });
  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  return (data ?? []) as RetrievedChunk[];
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
