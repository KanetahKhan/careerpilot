/**
 * ── Assistant service (CV-grounded chat) ────────────────────────────────────
 *
 * Responsibility: assemble the grounded context + system prompt for the chat
 * assistant and persist session memory. Streaming itself stays in the route
 * (framework-coupled), but everything that makes the assistant *CV-grounded* and
 * *honest* lives here so it is testable and reusable.
 *
 * Public API:
 *   · buildGroundedContext(query) → { context, retrieved }  (RAG retrieval)
 *   · assistantSystemPrompt(context) → string               (anti-hallucination prompt)
 *   · persistTurn(sessionId, userText, assistantText)        (best-effort memory)
 *
 * Inputs:  user query + chat history.
 * Outputs: grounded context, system prompt, persisted turn.
 * Depends on: profile service (retrieval), core lib/supabase (chat_messages).
 *             Intent routing is layered on top of this in a later phase.
 */
export {
  buildGroundedContext,
  assistantSystemPrompt,
  persistTurn,
  type RetrievedMeta,
} from "./assistant";
