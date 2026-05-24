import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

/**
 * Central place for model choices so you can swap providers in ONE spot.
 * If Gemini rate-limits during the demo, change `chatModel` to a Groq model
 * via `@ai-sdk/groq` and nothing else needs to change.
 */
// flash-lite has a much higher free-tier request quota than flash, which keeps
// the demo off the 429 rate-limit ceiling. Swap back to "gemini-2.5-flash" if you
// move to a paid tier and want the stronger model.
export const chatModel = google("gemini-2.5-flash-lite");

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

/** Calm, user-facing copy for when a provider rate-limits us (429). */
export const AI_BUSY_MESSAGE = "AI is busy — please wait a few seconds and try again.";

/** Detect a provider rate-limit / quota error (429 / RESOURCE_EXHAUSTED). */
export function isRateLimitError(e: unknown): boolean {
  const err = e as any;
  const status = err?.statusCode ?? err?.status ?? err?.response?.status;
  if (status === 429) return true;
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return /\b429\b|quota exceeded|resource_exhausted|rate limit|too many requests/.test(msg);
}
