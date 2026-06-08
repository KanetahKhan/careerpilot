import type { CoreMessage, LanguageModel, ToolSet } from "ai";
import type { ZodType } from "zod";

/**
 * Central place for model choices and the LLM fallback chain.
 *
 * When DEMO_MODE=1 is set in .env.local, the router returns canned responses
 * without calling any external API — useful for eval / presentation when free
 * tier rate limits are exhausted.
 *
 * Provider SDKs (@ai-sdk/google, @ai-sdk/groq) and the AI SDK core ("ai") are
 * lazy-imported to keep the webpack compilation graph small — without this,
 * every API route that imports this module forces the entire AI SDK tree to
 * be compiled eagerly, consuming ~GBs of heap.
 */

const DEMO_MODE = process.env.DEMO_MODE === "1";

// ── Lazy model initializers ────────────────────────────────────────────

let _chatModel: LanguageModel | undefined;
async function getGeminiModel(): Promise<LanguageModel> {
  if (!_chatModel) {
    const { google } = await import("@ai-sdk/google");
    _chatModel = google("gemini-2.5-flash-lite");
  }
  return _chatModel;
}

let _groqChatModel: LanguageModel | undefined;
async function getGroqModel(): Promise<LanguageModel> {
  if (!_groqChatModel) {
    const { createGroq } = await import("@ai-sdk/groq");
    const groqClient = createGroq({ apiKey: process.env.GROQ_API_KEY });
    _groqChatModel = groqClient("llama-3.3-70b-versatile");
  }
  return _groqChatModel;
}

/** True only when a Groq key is configured — otherwise we skip the fallback. */
export function groqEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

// ── Module-global state (persisted across HMR via globalThis) ────────────────
// Next.js dev server hot-reloads modules, resetting module-level `const`.
// Storing mutable state on globalThis keeps it alive across reloads.

interface GlobalAiState {
  __rateLimitState: Record<string, number[]>;
  __circuitBreakerState: Record<string, { failures: number[]; openUntil: number }>;
}

const G = globalThis as unknown as GlobalAiState;

// Sliding window rate limiter state — array of hit timestamps per limiter key
G.__rateLimitState ??= {};
function slidingWindowAllow(key: string, maxHits: number, windowMs: number): boolean {
  const now = Date.now();
  const hits: number[] = (G.__rateLimitState[key] ??= []);
  G.__rateLimitState[key] = hits.filter((t) => now - t < windowMs);
  if (G.__rateLimitState[key].length >= maxHits) return false;
  G.__rateLimitState[key].push(now);
  return true;
}

// Circuit breaker state — { failures: number[], openUntil: number }
G.__circuitBreakerState ??= {};
function circuitBreakerAllow(key: string, threshold: number, cooldownMs: number): boolean {
  const state: { failures: number[]; openUntil: number } = (G.__circuitBreakerState[key] ??= {
    failures: [],
    openUntil: 0,
  });
  const now = Date.now();

  if (now < state.openUntil) return false;

  // Prune failures outside the cooldown window
  state.failures = state.failures.filter((t) => now - t < cooldownMs);
  return state.failures.length < threshold;
}

function circuitBreakerRecordFailure(key: string, threshold: number, cooldownMs: number) {
  const state: { failures: number[]; openUntil: number } = (G.__circuitBreakerState[key] ??= {
    failures: [],
    openUntil: 0,
  });
  const now = Date.now();
  state.failures.push(now);
  state.failures = state.failures.filter((t) => now - t < cooldownMs);
  if (state.failures.length >= threshold) {
    state.openUntil = now + cooldownMs;
  }
}

type Provider = { name: string; enabled: boolean; getModel: () => Promise<LanguageModel> };

async function getProviders(): Promise<Provider[]> {
  // Both providers get circuit-breakers. After 2 failures they're skipped for 60s,
  // preventing the AI SDK's internal 3-retry loop from burning API calls.
  const groqLimited = !slidingWindowAllow("groq", 8, 60_000);           // 8 req/min
  const groqTripped = !circuitBreakerAllow("groq", 2, 60_000);         // 2 failures → 60s cooldown
  const groqEnabledFlag = groqEnabled() && !groqLimited && !groqTripped;

  const geminiLimited = !slidingWindowAllow("gemini", 15, 60_000);     // 15 req/min
  const geminiTripped = !circuitBreakerAllow("gemini", 2, 60_000);     // 2 failures → 60s cooldown
  const geminiEnabledFlag = !geminiLimited && !geminiTripped;
  return [
    { name: "groq", enabled: groqEnabledFlag, getModel: getGroqModel },
    { name: "gemini", enabled: geminiEnabledFlag, getModel: getGeminiModel },
  ];
}

function logAttempt(name: string) {
  console.log(`[LLM Router] Attempting ${name}...`);
}

function logSuccess(name: string) {
  console.log(`[LLM Router] Success via ${name}`);
}

function logFailure(name: string, error: unknown) {
  const err = error as any;
  const detail = err?.status ?? err?.statusCode ?? err?.message ?? String(err);
  console.error(`[LLM Router] ${name} failed: ${detail}`);
}

/** Record a rate-limit failure on the circuit breaker. */
function recordRateLimit(name: string, error: unknown) {
  if (isRateLimitError(error)) {
    circuitBreakerRecordFailure(name, 2, 60_000);
  }
}

/** Small delay between provider fallback attempts to let rate limits recover. */
function fallbackDelay(attempt: number): Promise<void> {
  const ms = Math.min(500 * Math.pow(2, attempt - 1), 4000);
  return new Promise((r) => setTimeout(r, ms));
}

// ── Embedding ──────────────────────────────────────────────────────────

let _embeddingModel: any;
async function getEmbeddingModel() {
  if (!_embeddingModel) {
    const { google } = await import("@ai-sdk/google");
    _embeddingModel = google.textEmbeddingModel("gemini-embedding-001", {
      outputDimensionality: 768,
    });
  }
  return _embeddingModel;
}

/** Embed a single piece of text → 768-d vector. */
export async function embedText(text: string): Promise<number[]> {
  if (DEMO_MODE) return new Array(768).fill(0);
  const { embed } = await import("ai");
  const { embedding } = await embed({ model: await getEmbeddingModel(), value: text });
  return embedding;
}

/** Embed many texts in one call (used during CV ingestion). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (DEMO_MODE) return texts.map(() => new Array(768).fill(0));
  if (texts.length === 0) return [];
  const { embedMany } = await import("ai");
  const { embeddings } = await embedMany({ model: await getEmbeddingModel(), values: texts });
  return embeddings;
}

/** Calm, user-facing copy for when a provider rate-limits us (429). */
export const AI_BUSY_MESSAGE = "AI is busy — please wait a few seconds and try again.";

/** Detect a provider rate-limit / quota error (429 / RESOURCE_EXHAUSTED). */
export function isRateLimitError(e: unknown): boolean {
  const err = e as { statusCode?: number; status?: number; response?: { status?: number }; message?: string };
  const status = err?.statusCode ?? err?.status ?? err?.response?.status;
  if (status === 429) return true;
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return /\b429\b|quota exceeded|quota|resource_exhausted|rate limit|too many requests/.test(msg);
}

// ── Fallback wrappers ────────────────────────────────────────────────────────
// Each tries Groq first, then Gemini (rate-limited + circuit-broken).
// Any error triggers a fallback to the next provider.

/**
 * `generateText` with Gemini→Groq fallback. Used by the job-hunter agent loop;
 * preserves tools / maxSteps / system / prompt via passthrough options.
 */
type GenerateTextWithFallbackOpts = {
  system?: string;
  prompt?: string;
  messages?: CoreMessage[];
  maxSteps?: number;
  tools?: ToolSet;
  abortSignal?: AbortSignal;
  headers?: Record<string, string | undefined>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxRetries?: number;
};

export async function generateTextWithFallback(
  opts: GenerateTextWithFallbackOpts
) {
  if (DEMO_MODE) {
    return {
      text: "(Demo mode — AI calls disabled)",
      toolCalls: [],
      toolResults: [],
      finishReason: "stop" as const,
      usage: { promptTokens: 0, completionTokens: 0 },
      steps: [],
      warnings: [],
      response: { messages: [] },
    };
  }
  const { generateText } = await import("ai");
  const run = (model: LanguageModel) => generateText({ ...opts, model });
  let lastError: unknown = null;
  const providers = await getProviders();
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    if (!provider.enabled) continue;
    logAttempt(provider.name);
    if (i > 0) await fallbackDelay(i);
    try {
      const result = await run(await provider.getModel());
      logSuccess(provider.name);
      return result;
    } catch (e) {
      lastError = e;
      logFailure(provider.name, e);
      recordRateLimit(provider.name, e);
    }
  }
  throw lastError ?? new Error("All LLM providers failed");
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
  if (DEMO_MODE) {
    try {
      return { object: opts.schema.parse({}) };
    } catch {
      return { object: {} as OBJECT };
    }
  }
  const { generateObject } = await import("ai");
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
  let lastError: unknown = null;
  const providers = await getProviders();
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    if (!provider.enabled) continue;
    logAttempt(provider.name);
    if (i > 0) await fallbackDelay(i);
    try {
      const { object } = await run(await provider.getModel());
      logSuccess(provider.name);
      return { object };
    } catch (e) {
      lastError = e;
      logFailure(provider.name, e);
      recordRateLimit(provider.name, e);
    }
  }
  throw lastError ?? new Error("All LLM providers failed");
}

/**
 * Streaming chat with Gemini→Groq→OpenRouter fallback, returned as an AI-SDK data-stream
 * `Response` (the format `useChat` expects).
 *
 * Fallback rule: on any error, try the next provider in the chain and keep
 * streaming. If all providers fail, emit AI_BUSY_MESSAGE.
 */
export function streamTextWithFallback(opts: {
  system: string;
  messages: CoreMessage[];
  onFinish?: (text: string) => void | Promise<void>;
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
  /** Text to stream when every provider fails. Defaults to AI_BUSY_MESSAGE. */
  fallbackText?: string;
}): Response {
  if (DEMO_MODE) {
    const { onFinish, headers } = opts;
    const encoder2 = new TextEncoder();
    const demoStream = new ReadableStream({
      async start(controller) {
        const { formatDataStreamPart } = await import("ai");
        const demoText = "(Demo mode — This skill is not in your CV.)";
        controller.enqueue(encoder2.encode(formatDataStreamPart("text", demoText)));
        controller.enqueue(
          encoder2.encode(
            formatDataStreamPart("finish_message", {
              finishReason: "stop",
              usage: { promptTokens: 0, completionTokens: 0 },
            })
          )
        );
        controller.close();
        if (onFinish) { try { await onFinish(demoText); } catch { /* best-effort */ } }
      },
    });
    return new Response(demoStream, {
      headers: { "content-type": "text/plain; charset=utf-8", "x-vercel-ai-data-stream": "v1", ...headers },
    });
  }
  const { system, messages, onFinish, headers, abortSignal, fallbackText } = opts;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const { streamText, formatDataStreamPart } = await import("ai");

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
        provider: Provider
      ): Promise<{ started: boolean; error: unknown }> => {
        let started = false;
        let error: unknown = null;
        try {
          logAttempt(provider.name);
          const model = await provider.getModel();
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
        if (error) {
          logFailure(provider.name, error);
        } else {
          logSuccess(provider.name);
        }
        return { started, error };
      };

      let succeeded = false;
      const providers = await getProviders();
      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        if (!provider.enabled) continue;
        const result = await streamFrom(provider);
        if (result.error) {
          recordRateLimit(provider.name, result.error);
        }
        if (!result.error) {
          succeeded = true;
          break;
        }
        if (i < providers.length - 1) await fallbackDelay(i + 1);
      }

      if (!succeeded) {
        writeText(fallbackText ?? AI_BUSY_MESSAGE);
      }

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
