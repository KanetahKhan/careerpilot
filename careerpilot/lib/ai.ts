import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

/**
 * Central place for model choices so you can swap providers in ONE spot.
 * If Gemini rate-limits during the demo, change `chatModel` to a Groq model
 * via `@ai-sdk/groq` and nothing else needs to change.
 */
export const chatModel = google("gemini-2.5-flash");

// gemini-embedding-001, truncated to 768 dims (Matryoshka) to match the DB column.
const embeddingModel = google.textEmbeddingModel("gemini-embedding-001", {
  outputDimensionality: 768,
});

/** Embed a single piece of text → 768-d vector. */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

/** Embed many texts in one call (used during CV ingestion). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
  return embeddings;
}
