# System Design — Scaling to 10,000 users

## Assumptions
10,000 MAU · 1 CV/user (~30 chunks) · 10 assistant msgs/user/mo ·
5 job searches/user/mo · 2 cover letters/user/mo.

## Capacity & cost

| Item | Calculation | $/mo |
|------|-------------|------|
| Vector storage | 10,000 × 30 × 768 × 4B ≈ 92 MB | free (under 500MB) |
| Embedding calls | ~160K calls × ~80 tok @ $0.025/M | ~0.32 |
| LLM (Gemini Flash) | ~320K calls @ 1.5K in / 0.5K out | ~544 |
| Job API (JSearch) | 50K queries, 80% cache hit → 10K real | ~30 |
| Hosting (Vercel Pro) | 1 seat | 20 |
| Supabase Pro | backups + headroom | 25 |
| **Per user** | $639 / 10,000 | **≈ $0.064** |

> **AI-call budget note (post-upgrade).** The new features barely move this number:
> intent routing is heuristic-first (an LLM call only for ambiguous queries); the
> 5-factor fit score added education + location as **pure-math** factors with zero
> extra model calls; roadmaps are an occasional structured-output call. The per-user
> cost above stays essentially flat.

## Bottlenecks & mitigation
1. **Gemini rate limits in spikes** → provider fallback to Groq (one-line SDK swap).
2. **Ingestion > Vercel function timeout** → move embedding to Supabase Edge Functions
   or a queue (Inngest/QStash); stream progress to the UI.
3. **Vector latency at >1M chunks** → migrate pgvector → Qdrant when p95 > 200ms
   (not a concern until ~30K users).
4. **JSearch quota** → 24h-TTL cache keyed by query hash (implemented); Tavily as a
   fallback search tool the agent can call.
5. **LLM cost growth** → prompt caching (75% off cached input), context trimming,
   per-user daily quota.

## Reliability
- All external calls wrapped in try/catch with graceful fallbacks (seed jobs,
  best-effort persistence) so a single 429 never crashes a user flow.
- Job search degrades to cache → seed; assistant degrades to "no CV context yet"
  rather than erroring.
- Intent classification fails safe to "general", so the chat never breaks on it.
- **CI/CD & monitoring:** GitHub Actions keeps `main` lint/typecheck/build-green on
  every push and PR; `/api/health` gives uptime monitors a dependency-free liveness
  signal that won't false-alarm on a Gemini/Supabase rate limit.
