# `lib/services/` — domain services

CareerPilot ships as **one** Next.js app (single Vercel deploy), but its logic is
organized as five explicit domain services with hard boundaries. Each service owns
its data access and business rules; the `app/api/*` routes are **thin controllers**
(an API gateway) that validate input and delegate. This gives us microservices-style
separation of concerns without the operational cost of separate deployables.

```
app/api/*  (thin controllers / API gateway)
    │  delegates to
    ▼
lib/services/
  profile/     CV ingestion + RAG retrieval  ← the source of truth
  jobs/        job sourcing (cache → JSearch → seed)
  fit-score/   programmatic 0..100 ranking (auditable math, not an LLM number)
  assistant/   CV-grounded chat: context + prompt + memory
  tracker/     applications (Kanban) + goals persistence
lib/
  ai.ts        shared kernel — model + embeddings gateway (swap provider in 1 spot)
  supabase.ts  shared kernel — admin + browser + server DB clients
```

## Service contracts (responsibility · in → out · deps)

| Service | Responsibility | In → Out | Depends on |
|---------|----------------|----------|------------|
| **profile** | CV → chunks → embeddings; retrieve top-k | file → `IngestResult`; query → `RetrievedChunk[]` | `ai`, `supabase` |
| **jobs** | source postings, stay free-tier | query → `Job[]` | `supabase`, JSearch* |
| **fit-score** | compute auditable fit | (userId, jobDesc) → `FitBreakdown` | `ai`, `supabase`, profile |
| **assistant** | ground + prompt + persist chat | query → context/prompt; turn → stored | profile, `supabase` |
| **tracker** | applications + goals CRUD | payloads → rows | `supabase` |

\* JSearch is optional; jobs degrades to cache then bundled seed data.

## Rules of the boundary
- Routes never touch Supabase directly — they call a service.
- Services import the shared kernel (`@/lib/ai`, `@/lib/supabase`), never each other's
  internal files — only each other's `index.ts` barrel (e.g. fit-score and assistant
  both consume `@/lib/services/profile`).
- Each service's public surface is its `index.ts`; everything else is private.

## How this maps to a microservices deployment
Each service is already an independent, side-effect-light module behind a barrel.
To split them into independently deployed Vercel Functions, each `app/api/<svc>`
route is the function boundary; a service could be lifted into its own serverless
function (or a separate repo) with only its `index.ts` as the contract. The shared
kernel (`ai`, `supabase`) becomes a small published package. No business logic would
have to move — only the transport. We deliberately stop short of that split because a
single Vercel app keeps cold starts, latency, and ops cost lowest for this workload
(see `docs/STACK_REPORT.md`).
