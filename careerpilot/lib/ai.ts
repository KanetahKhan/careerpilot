import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import {
  embed,
  embedMany,
  generateText,
  generateObject,
  streamText,
  formatDataStreamPart,
  type CoreMessage,
  type LanguageModel,
} from "ai";
import type { ZodType } from "zod";

/**
 * Central place for model choices and the Gemini→Groq fallback.
 *
 * Primary chat/scoring model is Gemini Flash-Lite (high free-tier quota). If a
 * call hits a rate-limit / quota error (429 / RESOURCE_EXHAUSTED), the wrappers
 * below automatically retry the SAME operation on Groq so the demo survives a
 * mid-use Gemini throttle. Embeddings stay on Gemini (no Groq embedding model).
 */
export const chatModel = google("gemini-2.5-flash-lite");

// Groq fallback. `createGroq()` reads GROQ_API_KEY from the environment; the
// model object is harmless to construct even without a key — we gate every call
// on `groqEnabled()` so we never attempt Groq unless a key is configured.
const groq = createGroq();
export const fallbackChatModel = groq("llama-3.3-70b-versatile");

/** True only when a Groq key is configured — otherwise we skip the fallback. */
export function groqEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

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
  return /\b429\b|quota exceeded|quota|resource_exhausted|rate limit|too many requests/.test(msg);
}

/** Should we fall back to Groq for this error? Only rate-limits, only if keyed. */
function shouldFallback(e: unknown): boolean {
  return isRateLimitError(e) && groqEnabled();
}

// ── Fallback wrappers ────────────────────────────────────────────────────────
// Each tries Gemini first, then retries the SAME operation on Groq if Gemini
// rate-limits. Non-rate-limit errors propagate unchanged.

/**
 * `generateText` with Gemini→Groq fallback. Used by the job-hunter agent loop;
 * preserves tools / maxSteps / system / prompt via passthrough options.
 */
export async function generateTextWithFallback(
  opts: Omit<Parameters<typeof generateText>[0], "model">
) {
  const run = (model: LanguageModel) => generateText({ ...opts, model });
  try {
    return await run(chatModel);
  } catch (e) {
    if (shouldFallback(e)) return await run(fallbackChatModel);
    throw e;
  }
}

/**
 * `generateObject` with Gemini→Groq fallback. Used for skill extraction, intent
 * classification, and roadmap generation. The object type is inferred from the
 * zod schema.
 */
export async function generateObjectWithFallback<OBJECT>(opts: {
  schema: ZodType<OBJECT>;
  prompt: string;
  system?: string;
  schemaName?: string;
  schemaDescription?: string;
  temperature?: number;
}): Promise<{ object: OBJECT }> {
  const run = (model: LanguageModel) =>
    generateObject({
      model,
      schema: opts.schema,
      prompt: opts.prompt,
      system: opts.system,
      schemaName: opts.schemaName,
      schemaDescription: opts.schemaDescription,
      temperature: opts.temperature,
    });
  try {
    const { object } = await run(chatModel);
    return { object };
  } catch (e) {
    if (shouldFallback(e)) {
      const { object } = await run(fallbackChatModel);
      return { object };
    }
    throw e;
  }
}

/**
 * Streaming chat with Gemini→Groq fallback, returned as an AI-SDK data-stream
 * `Response` (the format `useChat` expects).
 *
 * Fallback rule: if Gemini fails to *start* the stream (errors before emitting
 * any token) with a rate-limit, we restart the stream on Groq from scratch. If
 * Gemini has already emitted tokens, we keep the partial answer rather than
 * duplicate it. If both providers fail (or Groq is unavailable), the assistant
 * bubble shows the calm AI_BUSY_MESSAGE instead of a raw error.
 */
export function streamTextWithFallback(opts: {
  system: string;
  messages: CoreMessage[];
  onFinish?: (text: string) => void | Promise<void>;
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
}): Response {
  const { system, messages, onFinish, headers, abortSignal } = opts;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      // Cleanup on client disconnect — stops token generation server-side
      if (abortSignal?.aborted) { closed = true; controller.close(); return; }
      const onAbort = () => { closed = true; try { controller.close(); } catch { /* already closed */ } };
      abortSignal?.addEventListener("abort", onAbort, { once: true });

      let full = "";
      const writeText = (delta: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(formatDataStreamPart("text", delta))); } catch { /* closed */ }
      };

      // Stream from one model; returns whether it emitted any token + any error.
      const streamFrom = async (
        model: LanguageModel
      ): Promise<{ started: boolean; error: unknown }> => {
        let started = false;
        let error: unknown = null;
        try {
          const result = streamText({ model, system, messages, abortSignal });
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              started = true;
              full += part.textDelta;
              writeText(part.textDelta);
            } else if (part.type === "error") {
              error = part.error;
              break;
            }
          }
        } catch (e) {
          error = e;
        }
        return { started, error };
      };

      const primary = await streamFrom(chatModel);

      if (primary.error && !primary.started) {
        // Nothing was streamed yet — safe to fall back or show a calm message.
        if (isRateLimitError(primary.error) && groqEnabled()) {
          const fb = await streamFrom(fallbackChatModel);
          if (fb.error && !fb.started) writeText(AI_BUSY_MESSAGE);
        } else {
          writeText(
            isRateLimitError(primary.error)
              ? AI_BUSY_MESSAGE
              : "Something went wrong — please try again."
          );
        }
      }
      // If primary.started but later errored, we keep the partial answer.

      if (!closed) {
        controller.enqueue(
          encoder.encode(
            formatDataStreamPart("finish_message", {
              finishReason: "stop",
              usage: { promptTokens: 0, completionTokens: 0 },
            })
          )
        );
        controller.close();
      }

      if (onFinish && !abortSignal?.aborted) {
        try {
          await onFinish(full);
        } catch {
          /* persistence is best-effort */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
      ...headers,
    },
  });
}
