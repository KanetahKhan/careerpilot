/**
 * ── Fit-score service (programmatic ranking) ────────────────────────────────
 *
 * Responsibility: compute an auditable 0..100 fit score for a job against the
 * user's CV. The number is TypeScript math, NOT an LLM opinion — the LLM only
 * extracts skill lists. This is the project's defensible differentiator.
 *
 * Public API:
 *   · computeFitScore(userId, jobDescription, jobLocation?) → FitBreakdown
 *   · explainFit(breakdown) → string   (prose justification; separate from scoring)
 *   · type FitBreakdown   (score + 5 sub-scores + matched/missing skills)
 *
 * Inputs:  userId, job description text (+ optional job location).
 * Outputs: FitBreakdown with a full, auditable factor breakdown.
 * Depends on: core lib/ai (embeddings + skill extraction), core lib/supabase
 *             (the user's stored cv_chunks). Consumed by: Job Hunter agent + UI.
 */
export { computeFitScore, explainFit, type FitBreakdown } from "./fit-score";
