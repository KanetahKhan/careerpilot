/**
 * ── Profile service (CV / RAG core) ─────────────────────────────────────────
 *
 * Responsibility: turn an uploaded CV into section-tagged, embedded chunks and
 * retrieve the most relevant chunks for a query. This is the single source of
 * truth every other service grounds against — nothing about the user is invented.
 *
 * Public API:
 *   Ingestion  · extractText(buffer, fileName) → raw text
 *              · chunkCv(text) → Chunk[]  (section-tagged, overlapping)
 *   Retrieval  · retrieveChunks(userId, query, k) → RetrievedChunk[] (cosine top-k)
 *              · formatContext(chunks) → string  (for a system prompt)
 *
 * Inputs:  PDF/DOCX/text buffer (ingestion); userId + query (retrieval).
 * Outputs: Chunk[] for storage; RetrievedChunk[] with similarity scores.
 * Depends on: core lib/ai (embeddings), core lib/supabase (cv_chunks + the
 *             match_cv_chunks RPC). Consumed by: assistant, fit-score, profile UI.
 */
export { extractText, chunkCv, type Chunk } from "./cv";
export { ingestCv, type IngestResult } from "./ingest";
export { retrieveChunks, formatContext, type RetrievedChunk } from "./rag";
