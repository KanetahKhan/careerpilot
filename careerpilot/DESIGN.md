# CareerPilot Design

## Vision

An open-source career companion that turns a single CV upload into a grounded job-hunting platform. The core insight: every recommendation — fit score, skill gap, roadmap, chat — must trace back to the user's actual CV, not a generic template or an LLM's invented facts.

## Three Pillars

### Pillar 1: Job Hunter (`/hunter`)
Natural-language job search with programmatic fit scoring. The agent loop searches live job listings (JSearch/Tavily), scores each against the CV using pure TypeScript math, and presents ranked results. Users can track applications directly from results.

### Pillar 2: AI Coach (`/assistant`)
A CV-grounded chat assistant. Every response is backed by RAG-retrieved chunks from the user's ingested CV, with cited sections displayed in the UI. Intent classification (heuristic + cheap LLM fallback) adapts the assistant's formatting per query type.

### Pillar 3: Roadmap, Skill Gap & Tracker
- **Roadmap** (`/roadmap`): generates a week-by-week learning plan grounded in CV gaps, materializable as real tracker entries. Supports `?goal=` query param for prefilled goals from other pages.
- **Skill Gap** (`/skill-gap`): compares the user's CV skills against benchmark profiles for common roles, producing a coverage ratio and explicit have/missing lists. Missing skills link to `/roadmap?goal=Learn ...` to build a plan.
- **Tracker** (`/tracker`): Kanban-style application tracking + goals + calendar events. Pushes nudge notifications based on activity.

## Data Model

```
users (Supabase Auth) ──→ cv_documents ──→ cv_chunks (pgvector, 768d embeddings)
                        → role_benchmarks (seeded + LLM-cached profiles)
                        → applications (tracked jobs)
                        → goals + events (roadmap materialisation)
                        → chat_messages (session memory)
                        → notifications (AI nudges with optional action payloads)
                        → job_cache (24h TTL, keyed by query hash)
```

## CV Pipeline

Two entry points converge on a single ingestion path:

### Entry points
1. **File upload** (`/api/cv/upload`): PDF/DOCX/TXT → `extractText` → `chunkCv` (section-aware)
2. **CV builder** (`/api/cv/build`): structured JSON form → `serializeBuilderCv` → sections

### Shared ingestion (`ingestSections`)
1. Delete old `cv_chunks` + `cv_documents` for the user
2. Insert new `cv_document` row
3. Size-based chunking (1200 chars, 150 overlap) per section
4. `embedBatch` via gemini-embedding-001 (768d Matryoshka)
5. Bulk insert into `cv_chunks`

### Chunk schema
| Column | Type | Purpose |
|--------|------|---------|
| id | bigint PK | auto-increment |
| user_id | uuid → auth.users | tenant isolation |
| document_id | bigint → cv_documents | parent document |
| section | text | experience / education / skills / projects / summary / certifications |
| content | text | chunk body |
| position | int | ordering within document |
| embedding | vector(768) | gemini-embedding-001 output |

### Retrieval (`match_cv_chunks` RPC)
Cosine similarity search via pgvector HNSW index. Returns top-k chunks with section tags and similarity scores. Used by the assistant for RAG context and by fit-score for building the CV centroid.

## Fit Score (The Differentiator)

The fit score is a **programmatic calculation**, not an LLM opinion. The LLM only extracts skill lists; every factor is pure TypeScript math.

### Five factors

| Factor | Weight | Method |
|--------|--------|--------|
| Semantic | 0.4 | Cosine similarity between job embedding and CV centroid |
| Skills | 0.3 | Overlap ratio: matched / required skills (case-insensitive set comparison) |
| Seniority | 0.1 | Inferred candidate years (date-range parser, merged intervals) vs. required years (explicit "N years" regex on JD) |
| Education | 0.1 | Degree rank comparison (PhD=4, Master's=3, Bachelor's=2, Diploma=1) |
| Location | 0.1 | String matching against job location, with remote/anywhere boost |

### Why not LLM scoring?
An LLM scoring a candidate is opaque, expensive, and inconsistent. Every `computeFitScore` call produces an auditable factor breakdown that the user can inspect and challenge. The prose explanation in `explainFit()` is a separate concern — it describes the number, it never decides it.

## Skill-Gap Analysis

### Benchmark profiles
A `role_benchmarks` table stores canonical "what this role requires" profiles with `role_slug` (unique key, ILIKE-matched) and `role_label` (display name):

| Column | Type | Purpose |
|--------|------|---------|
| id | bigint PK | auto-increment |
| role_slug | text UNIQUE | normalised lookup key (e.g. `swe-intern`) |
| role_label | text | human-readable display (e.g. "SWE Intern (general)") |
| skills | text[] | expected technical skills (lowercase, deduplicated) |
| source | text | `'seed'` (shipped) or `'llm'` (generated + cached) |
| created_at | timestamptz | row creation time |

- **Seed rows**: 10 roles shipped with the app: ML Engineer, Data Engineer, Frontend Engineer, Backend Engineer, Full-Stack Engineer, DevOps Engineer, Data Scientist, Mobile Engineer (RN), Embedded / Robotics Engineer, SWE Intern (general)
- **LLM-generated rows**: any role not in the seed triggers one structured-output LLM call; the result is cached in the DB so subsequent lookups are instant
- **Fallback**: if the DB and LLM both fail, `getBenchmark` returns a small generic set — it never throws

### Lookup (`getBenchmark`)
1. Normalise input to slug (lowercase, spaces→hyphens, strip non-alphanumeric)
2. ILIKE-match against `role_slug`
3. On miss: generate via LLM, cache, return
4. On total failure: return generic fallback

### Comparison
Given the user's extracted CV skills (from `loadCvContext`) and a benchmark:
- **Coverage** = `round(have.length / benchmarkSkills.length * 100)`
- **Have** = benchmark skills found in CV (case-insensitive set intersection)
- **Missing** = benchmark skills not in CV (kept in benchmark priority order)

The coverage ratio uses the same color tiers as fit score (≥75 emerald, ≥55 amber, else rose). The "Build roadmap" button links to `/roadmap?goal=Learn ...` to prefill a goal based on the missing skills.

### Assistant integration
When the chat intent classifier detects `skill_gap` and the query names a target role (extracted by regex after "for" or "as"), the chat route calls `getBenchmark` and appends the expected skills to the system prompt context. This makes the assistant's skill-gap answer consistent with what the dedicated `/skill-gap` page would produce.

## RAG Assistant

### Flow
1. User sends a chat message
2. `classifyIntent(query)` — heuristic regex first, cheap LLM fallback for "general"
3. `buildGroundedContext(userId, query)` — retrieves top-5 CV chunks via `match_cv_chunks` RPC, formats into a context block
4. `streamTextWithFallback` — streams Gemini (falls back to Groq on 429) with a system prompt that includes the grounded context and intent-specific formatting guidance

### Intents
| Intent | Trigger | Response Format |
|--------|---------|-----------------|
| readiness_check | "am I ready for X" | Verdict + 2-4 grounded reasons + next step |
| skill_gap | "what skills am I missing" | Ordered gap list + mention of /skill-gap page |
| roadmap | "give me a plan" | Week-by-week plan, measurable milestones |
| cover_letter | "write a cover letter" | Concise letter quoting real CV items |
| general | everything else | Default CV-grounded conversation |

### Persistence
Each turn is persisted to `chat_messages` (best-effort, non-blocking). The `/api/chat/history` route replays a session so the assistant survives page refresh.

## Agent Loop (Job Hunter)

The Job Hunter uses a tool loop rather than a rigid workflow. The model decides when to call:
- **`searchJobs`**: searches live jobs (JSearch primary, Tavily fallback, cache/seed as last resort)
- **`scoreFit`**: calls `computeFitScore` for each job against the user's CV context

The loop runs until the model returns a final answer. This means the agent can search, score, re-search, and refine autonomously.

## Tech Stack Decisions

### Single Next.js deploy (not microservices)
The code is organised into five domain services (`lib/services/*`), each with a hard boundary at its barrel `index.ts`. The natural function boundary already exists at `app/api/<svc>` — splitting into individual Vercel functions is a configuration change, not a refactor. Keeping one deploy minimises cold starts, latency, and ops cost for the target 10K-user scale.

### Node runtime
Every data route (`/api/cv/upload`, `/api/chat`, `/api/jobs/search`, `/api/skill-gap`, `/api/fit/*`) uses `export const runtime = "nodejs"` because the stack needs:
- Native PDF parsing (`pdf-parse`, `mammoth`)
- The Vercel AI SDK's `streamText` and `generateObject`
The Edge runtime would require WASM-compiled alternatives for every dependency.

### Gemini → Groq fallback
Every LLM call (chat, skill extraction, roadmap, intent classification) wraps Gemini with an automatic Groq fallback on 429/RESOURCE_EXHAUSTED. This keeps the demo alive through free-tier rate limits. Only chat streaming does a partial-fallback — if Gemini has emitted tokens before the error, we keep the partial answer rather than duplicating it.

### Fallback chain (job search)
`JSearch API → Tavily API search → cached results → seed data`. Each level degrades gracefully so the agent always has something to score.

### Supabase for everything
Auth (Google OAuth + email/password), PostgreSQL + pgvector, storage (avatars), RLS per-user isolation — all in one project. The service-role client is used server-side; the anon-key client is used in the browser with RLS policies as defense-in-depth.

## Security

### Per-route authorisation
Every API route calls `requireUser()` before touching data. This resolves the Supabase session from the request cookie and also handles a dev-only eval-user escape hatch for `npm run eval`.

### Tenant isolation
All per-user tables (`cv_chunks`, `applications`, `goals`, `events`, `chat_messages`) are keyed by `user_id` and scoped in every query. The service-role key is never shipped to the browser.

### RLS policies
Defined on every per-user table: `auth.uid() = user_id`. This protects against any direct anon-key access path.

## Cost Model (at 10K MAU)

| Item | Calculation | $/mo |
|------|-------------|------|
| Vector storage | 10,000 × 30 chunks × 768 × 4B = 92 MB | free (<500MB) |
| Embedding calls | ~160K × 80 tok @ $0.025/M tok | ~0.32 |
| LLM (Gemini Flash) | ~320K calls @ 1.5K in / 0.5K out | ~544 |
| Job API (JSearch) | 50K queries, 80% cache hit → 10K real | ~30 |
| Vercel Pro | 1 seat | 20 |
| Supabase Pro | backups + headroom | 25 |
| **Total** | | **~639** |
| **Per user** | | **~$0.064** |

## Key Design Decisions

1. **Programmatic fit score over LLM scoring** — auditable, deterministic, 100x cheaper per call
2. **Section-tagged chunks over flat text** — enables the UI to cite "experience" vs "education" and lets the RAG retrieval prefer relevant sections
3. **Shared ingestSections over duplicating the pipeline** — both file upload and structured CV builder flow through the same chunk→embed→insert path
4. **Heuristic-first intent classification** — regex resolves 80% of queries instantly; only ambiguous queries hit the LLM, which is the same model that will answer, so there is no additional provider dependency
5. **Seeded role benchmarks + LLM fallback** — common roles are instant (no model call); rare roles generate once and cache; avoids an LLM call on every skill-gap request
6. **Separate seniority estimators for CV and JD** — `estimateExperienceYears` infers from date ranges (with interval merging); `estimateRequiredYears` matches explicit "N years" text. They answer different questions.
