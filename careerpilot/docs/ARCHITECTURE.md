# Architecture

## Data flow: CV upload → agent response

```
┌─────────────┐     PDF/DOCX      ┌──────────────────────────────────────┐
│   Browser   │ ────────────────▶ │  /api/cv/upload  (Node runtime)      │
│  (uploader) │                   │  extractText → chunkCv(section-aware) │
└─────────────┘                   │  → embedBatch (gemini-embedding-001)  │
                                  └───────────────┬──────────────────────┘
                                                  │ insert vectors
                                                  ▼
                                  ┌──────────────────────────────────────┐
                                  │   Supabase Postgres + pgvector        │
                                  │   cv_chunks(embedding vector(768))    │
                                  │   + HNSW index + match_cv_chunks()    │
                                  └───────────────▲──────────────────────┘
                                                  │ top-k cosine
        ┌─────────────────────────┬──────────────┴───────────────┐
        │                         │                              │
 ┌──────┴───────┐        ┌────────┴─────────┐          ┌─────────┴──────────┐
 │ /api/chat    │        │ /api/jobs/search │          │  lib/fit-score.ts  │
 │ retrieve →   │        │  AGENT LOOP      │          │  semantic = cosine │
 │ inject ctx → │        │  searchJobs ───▶ │          │  (job, CV centroid)│
 │ streamText   │        │  scoreFit  ───▶  │──────────▶  + skill overlap   │
 │ (Gemini)     │        │  rank cards      │          │  + seniority       │
 └──────┬───────┘        └────────┬─────────┘          └────────────────────┘
        │ stream                  │ JSON cards
        ▼                         ▼
   Assistant UI              Job Hunter UI ──(+ Track)──▶ /api/applications
   (cited chunks)            (fit breakdown)                    │
                                                                ▼
                                                         Tracker UI (Kanban
                                                         + goals + dashboard)
```

## Runtime choices
- **Node runtime** on CV upload (pdf-parse/mammoth need Node), chat, and agent routes.
- **Streaming** on `/api/chat` so long answers don't hit function timeouts.
- **Caching** on job search (`job_cache` table keyed by query hash) so the free
  JSearch quota survives repeated demo runs.

## Why each agent uses the CV
Both the assistant and the fit-score path **retrieve from `cv_chunks`** before
producing output. The assistant injects chunks into its system prompt; the fit
score uses the stored chunk embeddings to build a CV centroid. Nothing about the
user is invented — it all traces back to uploaded chunks.

## DevOps: CI & health
- **CI** (`.github/workflows/ci.yml`): every push to `main` and every PR runs
  `npm ci → lint → tsc --noEmit → next build` on Node 20 with npm caching. The app
  is nested in `careerpilot/`, so the workflow defaults its run steps to that
  directory and caches on `careerpilot/package-lock.json`. The README CI badge is
  the at-a-glance signal that `main` builds and typechecks.
- **Health endpoint** (`/api/health`): a dependency-free liveness probe returning
  `{ status, time, uptime, version }`. It deliberately avoids Supabase/Gemini so it
  reports *web-tier* liveness and never trips on a free-tier rate limit — the right
  signal for an uptime monitor or platform healthcheck.
- **Deployment** stays a single Next.js app on Vercel (git-push deploys, zero
  config). See `docs/STACK_REPORT.md` for why we keep one deployable unit rather
  than splitting a separate backend service.
