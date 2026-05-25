# Stack Report

## Thesis
A CV-grounded RAG layer is the single source of truth; every agent reads from it.
We optimized for **$0 infrastructure during the hackathon** and **fastest path to a
working agentic loop**, on a stack that deploys to Vercel with zero config.

## Choices & tradeoffs

| Layer | Chosen | Why this | Why not the alternative |
|-------|--------|----------|--------------------------|
| Framework | Next.js 15 (App Router) | One repo for UI + API routes; deploys to Vercel free | Separate SPA + server = more moving parts |
| AI orchestration | Vercel AI SDK v4 | Smallest abstraction; native streaming; `tool` + `maxSteps` agent loop in ~30 lines | LangChain.js: heavier bundle, no edge, slower to ship |
| LLM | Gemini 2.5 Flash-Lite (+ Groq fallback) | Free tier; 1M context; automatic Groq failover on a 429 | OpenAI/Anthropic: no free tier for sustained dev |
| Embeddings | gemini-embedding-001 (768-d) | Free; same SDK; Matryoshka truncation saves 4× storage | OpenAI text-embedding-3: not free |
| Vector DB | Supabase pgvector (HNSW) | Free 500MB; same DB as app state → one connection | Pinecone: separate service + still need a relational DB |
| App DB / Auth | Supabase Postgres / Auth | Google OAuth + email/password live; per-user isolation; free | Custom auth: slower, riskier |
| Jobs | JSearch (RapidAPI) + cache | Real Google-for-Jobs data; cache keeps us on free tier | Scraping: brittle, ToS risk |
| Deploy | Vercel Hobby | 1M invocations free; git-push deploys | Self-host: ops overhead in a 14-day window |

## Architectural decisions (ADRs)
- **AD-1 — Fit score is programmatic, now 5 factors.** The number is computed in
  `lib/services/fit-score/` from five factors — semantic (cosine), skill overlap,
  seniority, **education**, and **location** — weighted .40/.30/.10/.10/.10, never
  "decided" by the LLM (it only extracts skill lists). Prose lives in a separate
  `explainFit()`. Rationale: auditable, deterministic-ish, defensible to judges.
- **AD-2 — Section-aware chunking.** We tag chunks by CV section so retrieval can be
  explained ("cited from Experience") and weighted later. Rationale: explainability.
  The `/profile` view renders these chunks back to make grounding visible.
- **AD-3 — Real Supabase Auth + service-role data access.** Users sign in with Google
  OAuth or email/password. Middleware refreshes the session and gates the app routes;
  every API route resolves `auth.uid()` via `requireUser()` and scopes each query by
  `user_id`. Server-side data access uses the service-role key (never exposed to the
  browser), and the RLS owner-policies (`auth.uid() = user_id`) ship as defense-in-depth
  for any direct anon-key path. Rationale: real multi-tenant isolation with a single,
  auditable enforcement point in the service layer.
- **AD-4 — Seed/cache fallback for jobs.** The demo never depends on a live quota.
  Rationale: demo-day reliability. (Cached real data, not faked agent output.)
- **AD-5 — Domain services behind a thin API gateway.** Logic lives in
  `lib/services/{profile,jobs,fit-score,assistant,tracker}` behind per-service
  barrels; `app/api/*` routes only validate + delegate. Rationale: microservices-style
  separation of concerns without the cost of separate deployables (see below).
- **AD-6 — Intent routing is heuristic-first.** A keyword classifier handles the
  common cases for free; only ambiguous queries spend one cheap structured Gemini
  call, falling back to "general" on any error. Rationale: smarter answers with
  near-zero added latency/cost and no new failure mode.
- **AD-7 — CI in GitHub Actions.** Every push/PR runs lint → typecheck → build on
  Node 20 with npm caching. Rationale: own the "DevOps" half of the track; keep
  `main` always green and deployable.
- **AD-8 — Automatic Gemini→Groq fallback for every LLM call.** Model selection and
  the failover live in `lib/ai.ts` behind three wrappers (`generateTextWithFallback`,
  `generateObjectWithFallback`, `streamTextWithFallback`). On a rate-limit/quota error
  (429 / RESOURCE_EXHAUSTED) the same operation retries on Groq `llama-3.3-70b-versatile`;
  the streaming chat falls back only if Gemini fails *before* emitting a token, so a
  partial answer is never duplicated. If both providers fail, the user sees the calm
  `AI_BUSY_MESSAGE` rather than a raw error. Embeddings stay on Gemini. Rationale:
  directly neutralizes the plan's "Gemini rate-limit mid-demo" critical risk.

## Why a monolith on Vercel (not a separate Python backend)
A common alternative is a split FastAPI/Python service + a separate React SPA. We
deliberately chose **one** Next.js app, and treat the split as a tradeoff we made
with eyes open:

- **One language, one repo, one deploy.** TypeScript end-to-end means the `Job`,
  `FitBreakdown`, and `Roadmap` types are shared by the API and the UI with zero
  serialization drift. A Python backend would duplicate every model and add a
  network hop the demo doesn't need.
- **Lower latency + cost on free tiers.** Co-locating UI and API routes on Vercel
  removes a cross-service round trip and a second host to keep warm. A separate
  Python service means a second cold-start path and another platform's free-tier limits.
- **The AI ecosystem is here.** The Vercel AI SDK's streaming, tool-calling, and
  structured output are first-class in TS; replicating the agent loop + `useChat`
  streaming across a Python/React boundary is more code for no user-visible gain.
- **We kept the seams, not the servers.** AD-5 means the code is already split into
  services with hard boundaries, so if a workload ever demanded an independent
  Python ML service we could lift one service out behind its existing contract —
  without the day-one operational tax. For a 14-day hackathon workload, monolith-on-
  Vercel is strictly the lower-risk, lower-cost choice.

## What we'd do with more time
Cohere/BGE reranking after retrieval; hybrid BM25 + vector search; cross-session
memory (mem0); background ingestion queue (Inngest/QStash); per-user rate quotas and
prompt caching to bound LLM cost at scale.
