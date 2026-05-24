# Stack Report

## Thesis
A CV-grounded RAG layer is the single source of truth; every agent reads from it.
We optimized for **$0 infrastructure during the hackathon** and **fastest path to a
working agentic loop**, on a stack that deploys to Vercel with zero config.

## Choices & tradeoffs

| Layer | Chosen | Why this | Why not the alternative |
|-------|--------|----------|--------------------------|
| Framework | Next.js 15 (App Router) | One repo for UI + API routes; deploys to Vercel free | Separate SPA + server = more moving parts |
| AI orchestration | Vercel AI SDK | Smallest abstraction; native streaming; `tool` + `stepCountIs` agent loop in ~30 lines | LangChain.js: heavier bundle, no edge, slower to ship |
| LLM | Gemini 2.5 Flash | Free tier; 1M context; one-line swap to Groq fallback | OpenAI/Anthropic: no free tier for sustained dev |
| Embeddings | gemini-embedding-001 (768-d) | Free; same SDK; Matryoshka truncation saves 4× storage | OpenAI text-embedding-3: not free |
| Vector DB | Supabase pgvector (HNSW) | Free 500MB; same DB as app state → one connection | Pinecone: separate service + still need a relational DB |
| App DB / Auth | Supabase Postgres / Auth | RLS-ready multi-tenancy; free | Custom auth: slower, riskier |
| Jobs | JSearch (RapidAPI) + cache | Real Google-for-Jobs data; cache keeps us on free tier | Scraping: brittle, ToS risk |
| Deploy | Vercel Hobby | 1M invocations free; git-push deploys | Self-host: ops overhead in a 14-day window |

## Architectural decisions (ADRs)
- **AD-1 — Fit score is programmatic.** The number is computed in `lib/fit-score.ts`
  (cosine + skill overlap + seniority), never "decided" by the LLM. Rationale:
  auditable, deterministic-ish, and defensible to judges.
- **AD-2 — Section-aware chunking.** We tag chunks by CV section so retrieval can be
  explained ("cited from Experience") and weighted later. Rationale: explainability.
- **AD-3 — Service-role + demo user for the MVP.** Faster than full auth; RLS policies
  are already written so production multi-tenancy is a small swap. Rationale: ship speed.
- **AD-4 — Seed/cache fallback for jobs.** The demo never depends on a live quota.
  Rationale: demo-day reliability. (Cached real data, not faked agent output.)

## What we'd do with more time
Cohere/BGE reranking after retrieval; hybrid BM25 + vector search; cross-session
memory (mem0); background ingestion queue (Inngest/QStash); full Supabase Auth.
