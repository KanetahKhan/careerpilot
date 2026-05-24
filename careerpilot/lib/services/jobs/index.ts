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
 *   · SEED_JOBS                                (bundled real-shaped fallback data)
 *   · type Job                                 (normalized posting shape)
 *
 * Inputs:  free-text query (+ optional location).
 * Outputs: normalized Job[] (id, role, company, location, salary, link, …).
 * Depends on: core lib/supabase (job_cache), external JSearch (optional).
 */
export { searchJobs, type Job } from "./jobs";
export { SEED_JOBS } from "./seed-jobs";
