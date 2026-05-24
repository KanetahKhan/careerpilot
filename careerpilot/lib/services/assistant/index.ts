/**
 * ── Assistant service (CV-grounded chat) ────────────────────────────────────
 *
 * Responsibility: assemble the grounded context + system prompt for the chat
 * assistant and persist session memory. Streaming itself stays in the route
 * (framework-coupled), but everything that makes the assistant *CV-grounded* and
 * *honest* lives here so it is testable and reusable.
 *
 * Public API:
 *   · classifyIntent(query) → Intent          (heuristic + cheap LLM fallback)
 *   · buildGroundedContext(query) → { context, retrieved }  (RAG retrieval)
 *   · assistantSystemPrompt(context, intent) → string       (intent-adapted prompt)
 *   · persistTurn(sessionId, userText, assistantText)        (best-effort memory)
 *   · generateRoadmap(goal) → Roadmap          (structured, CV-grounded plan)
 *
 * Inputs:  user query + chat history; roadmap goal.
 * Outputs: intent, grounded context, system prompt, persisted turn, roadmap.
 * Depends on: profile service (retrieval), core lib/ai + lib/supabase.
 */
export {
  buildGroundedContext,
  assistantSystemPrompt,
  persistTurn,
  type RetrievedMeta,
} from "./assistant";
export {
  classifyIntent,
  heuristicIntent,
  intentGuidance,
  INTENTS,
  type Intent,
} from "./intent";
export { generateRoadmap, RoadmapSchema, type Roadmap } from "./roadmap";
