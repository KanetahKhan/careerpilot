/**
 * ── Jobs service (Job Hunter sourcing) ──────────────────────────────────────
 *
 * Responsibility: source job postings for a natural-language query while staying
 * on the free tier. Strategy: Supabase cache → live JSearch (if RAPIDAPI_KEY) →
 * bundled seed jobs. The Job Hunter agent calls this as its `searchJobs` tool;
 * fit-score then ranks the results.
 *
 * Public API:
 *   · searchJobs(query, location?) → Job[]   (cache → live → seed fallback)
 *   · webSearchJobs(query) → WebResult[]      (Tavily open-web fallback; [] if no key)
 *   · tavilyEnabled() → boolean               (is the Tavily web-search tool available)
 *   · SEED_JOBS                                (bundled real-shaped fallback data)
 *   · type Job, WebResult                      (normalized posting / web-lead shapes)
 *
 * Inputs:  free-text query (+ optional location).
 * Outputs: normalized Job[] (id, role, company, location, salary, link, …).
 * Depends on: core lib/supabase (job_cache), external JSearch + Tavily (both optional).
 */
export { searchJobs, type Job } from "./jobs";
export { webSearchJobs, tavilyEnabled, type WebResult } from "./web-search";
export { SEED_JOBS } from "./seed-jobs";
