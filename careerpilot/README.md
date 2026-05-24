# CareerPilot 🧭

[![CI](https://github.com/KanetahKhan/careerpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/KanetahKhan/careerpilot/actions/workflows/ci.yml)

> Your agentic, **CV-grounded** career co-pilot. Built for CodeSprint 2026 (IUT Computer Society · Poridhi.io).

Upload your CV once. Every job match, fit score, roadmap, and cover letter is grounded in your **actual** experience via a RAG layer over your resume — no hallucinated generic profiles.

**Live demo:** _add your Vercel URL_ · **Demo video:** _add your link_

---

## The four pillars

| # | Pillar | What it does | Route |
|---|--------|--------------|-------|
| 1 | **Job Hunter Agent** | NL search → live jobs (JSearch) → tool-calling loop → ranked cards with a **computed 5-factor** fit score (+ detail view) | `/hunter` |
| 2 | **Resume Intelligence (RAG core)** | CV → section-aware chunking → Gemini embeddings → pgvector; guided onboarding + a profile view of the exact retrieved chunks | `/onboarding` · `/profile` |
| 3 | **AI Assistant** | Chat grounded strictly in your CV, with **intent routing** + session memory; readiness, gap analysis, cover letters, and a structured week-by-week roadmap | `/assistant` · `/roadmap` |
| 4 | **Progress Tracker** | Kanban board, goals/to-dos, live progress dashboard | `/tracker` |

---

## Quick start

> 📋 **New teammate?** Read [`SETUP.md`](SETUP.md) first — it's the living team
> setup log. Whenever anyone changes `.env.local` or any config, they update
> `SETUP.md` in the same commit so the rest of the team stays in sync.

```bash
# 1. install
npm install

# 2. set up Supabase
#    - create a free project at supabase.com
#    - SQL Editor → paste & run supabase/migrations/0001_init.sql
#      (enables pgvector, creates tables + match_cv_chunks RPC + seed data)

# 3. configure env
cp .env.example .env.local
#    fill in: GOOGLE_GENERATIVE_AI_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
#    NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#    (RAPIDAPI_KEY optional — without it, job search uses bundled seed data)

# 4. run
npm run dev          # → http://localhost:3000

# 5. (optional) verify everything works
npm run eval         # runs the documented test suite against your dev server
```

> **Cost:** every dependency runs on a free tier. **Do not enable billing** on any
> service — without it the worst case is a rate-limit (429), never a charge.

### Required environment variables

| Var | Where | Notes |
|-----|-------|-------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | aistudio.google.com/apikey | Gemini chat + embeddings (free tier) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings | client reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings | **server-only**, bypasses RLS |
| `RAPIDAPI_KEY` | rapidapi.com → JSearch (Basic $0) | optional; falls back to seed jobs |
| `DEMO_USER_ID` | — | single-user demo id (matches the seeded profile) |

---

## How RAG is grounded in the CV

This is the core thesis — the AI never invents your background.

1. **Ingest** (`/api/cv/upload` → `lib/services/profile/`): the PDF/DOCX is parsed,
   then **chunked by section** (Experience, Education, Projects, Skills…) so each
   chunk carries a section tag. The `/profile` view renders these chunks back.
2. **Embed** (`lib/ai.ts`): each chunk → a 768-d vector via `gemini-embedding-001`.
3. **Store** (`supabase/migrations/0001_init.sql`): vectors live in a `cv_chunks`
   table with an **HNSW pgvector index**.
4. **Retrieve** (`lib/services/profile/rag.ts`): every assistant question and every
   fit-score computation embeds the query and pulls the top-k chunks via the
   `match_cv_chunks` RPC (cosine similarity).
5. **Ground**: retrieved chunks are injected into the system prompt as context,
   and the assistant is instructed to **cite the section** and to say "your CV
   doesn't mention X" rather than fabricate.

### The fit score is computed, not stated

`lib/services/fit-score/` returns a real number from TypeScript math, not an LLM
opinion — **five** auditable factors:

```
fit = 0.40·semantic + 0.30·skills + 0.10·seniority + 0.10·education + 0.10·location
```

- **semantic** — cosine(job embedding, centroid of CV chunk embeddings)
- **skills** — matched ÷ required skills (skills extracted via structured output)
- **seniority** — years required vs. years in CV
- **education** — candidate's highest degree vs. the level the job asks for
- **location** — remote → 100; otherwise the job's place matched against the CV

The LLM only extracts skill lists; the factors, weights, and blend are all
TypeScript. A separate `explainFit()` turns the breakdown into prose (scoring never
writes prose). The Hunter UI shows all five bars + matched/missing skills, and a
**detail view** with the full description — so the score is fully auditable.

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data-flow + service-
boundary diagrams, [`docs/STACK_REPORT.md`](docs/STACK_REPORT.md) for stack
justification (incl. why monolith-on-Vercel, not a separate Python backend), and
[`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) for the 10K-user scaling analysis.

The code is organized into five documented domain services behind thin API routes —
see [`lib/services/README.md`](lib/services/README.md). **CI** (lint → typecheck →
build) runs on every push/PR via GitHub Actions; `/api/health` is a dependency-free
liveness probe.

```
CV upload ─▶ parse ─▶ chunk(section) ─▶ embed(Gemini) ─▶ pgvector
                                                            │
 user query ─▶ embed ─▶ match_cv_chunks ─▶ context ─┬──▶ Assistant (stream)
                                                     └──▶ Fit score (semantic part)
 NL job request ─▶ Agent(loop): searchJobs → scoreFit → ranked cards
```

## Tech stack

Next.js 15 (App Router) · Vercel AI SDK · Google Gemini 2.5 Flash · `gemini-embedding-001` ·
Supabase Postgres + pgvector · JSearch (RapidAPI) · Tailwind CSS · Recharts · deployed on Vercel.

## Notes & honesty

- **Demo mode** uses a single seeded user (`DEMO_USER_ID`) and the Supabase service
  role server-side. RLS policies for real multi-user auth are already in the migration
  — wire Supabase Auth and swap `DEMO_USER_ID` for `auth.uid()` to go multi-tenant.
- Job data falls back to bundled **real-shaped seed data** when no `RAPIDAPI_KEY` is
  set or the free quota is exhausted. This is cached real data, not faked agent output.
- Built with AI assistance (see `PROMPTS.md` if you keep one) — core logic written and
  reviewed during the hackathon.
