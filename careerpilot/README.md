# CareerPilot — Your Agentic Career Co-pilot

[![CI](https://github.com/KanetahKhan/careerpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/KanetahKhan/careerpilot/actions/workflows/ci.yml)

> Stop applying blindly. CareerPilot reads your CV, scores job fit with real math, and tracks every application — all grounded in your actual experience, not generic advice.

Built in 14 days for [CodeSprint 2026](https://poridhi.io) (IUT Computer Society).

**Live demo:** _add your Vercel URL_ · **Demo video:** _add your link_

---

## 🚀 Live Demo

**URL:** _add your Vercel/Render/Railway URL here_

**Sign in:** Create an account at `/signup` (email + password) or use **Continue with Google**. Each user gets their own CV, applications, and chat history, isolated per account. After signing in, upload your CV from `/onboarding` to personalize everything.

---

## The Four Pillars

| # | Pillar | What it does | Route |
|---|--------|--------------|-------|
| 1 | **Job Hunter Agent** | Natural language search via a tool-calling agent loop (JSearch live API → Supabase cache → bundled seed fallback), programmatic fit scores with 5-factor breakdown (semantic, skills, seniority, education, location) | `/hunter` |
| 2 | **CV Brain (RAG Core)** | PDF/DOCX/TXT upload, section-aware chunking, Gemini embeddings, pgvector HNSW storage, contextual retrieval | `/onboarding` · `/profile` |
| 3 | **AI Coach** | Streaming chat with RAG-grounded responses, **citation chips** showing which CV sections were used, intent detection, roadmap generation, cover letter drafting | `/assistant` · `/roadmap` |
| 4 | **Tracker** | Drag-and-drop Kanban (Applied → Interviewing → Offer → Rejected), goals/to-dos, progress dashboard with Recharts, manual application entry | `/tracker` |

---

## 🏗️ Architecture

```
User Uploads CV
  → pdf-parse / mammoth → raw text
  → Section-aware chunking (Experience, Education, Skills, Projects)
  → embed() → Gemini embedding-001 (768-d)
  → Supabase pgvector (cv_chunks table, HNSW index)

User Asks Question / Searches Jobs
  → embed(query) via Gemini
  → match_cv_chunks() RPC → top-k similar chunks
  → Inject chunks into LLM system prompt
  → streamText() → Gemini 2.5 Flash
  → Streamed response + citation chips (x-retrieved header)

User Tracks Applications
  → Drag-and-drop Kanban → PATCH /api/applications
  → Recharts dashboard → real DB aggregation
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full data-flow diagrams, [`docs/STACK_REPORT.md`](docs/STACK_REPORT.md) for stack justification, and [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) for the 10K-user scaling analysis.

---

## How RAG is Grounded in the CV

This is the core thesis — the AI never invents your background.

1. **Ingest** (`/api/cv/upload`): the PDF/DOCX is parsed, then **chunked by section** (Experience, Education, Projects, Skills…) so each chunk carries a section tag.
2. **Embed** (`lib/ai.ts`): each chunk → a 768-d vector via `gemini-embedding-001`.
3. **Store**: vectors live in a `cv_chunks` table with an **HNSW pgvector index**.
4. **Retrieve** (`lib/services/profile/rag.ts`): every query embeds and pulls the top-k chunks via the `match_cv_chunks` RPC (cosine similarity).
5. **Ground**: retrieved chunks are injected into the system prompt. The assistant **cites the section** and says "your CV doesn't mention X" rather than fabricate.

### The Fit Score is Computed, Not Stated

`lib/services/fit-score/` returns a real number from TypeScript math, not an LLM opinion:

```
fit = 0.40·semantic + 0.30·skills + 0.10·seniority + 0.10·education + 0.10·location
```

- **semantic** — cosine(job embedding, centroid of CV chunk embeddings)
- **skills** — matched ÷ required skills (extracted via structured output)
- **seniority** — years required vs. years in CV
- **education** — candidate's highest degree vs. the level the job asks for
- **location** — remote → 100; otherwise matched against the CV

The LLM only extracts skill lists; the factors, weights, and blend are all TypeScript. The Hunter UI shows all five bars + matched/missing skills.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 15.5.7 (App Router) | Frontend + API routes |
| Language | TypeScript 5.7 | Type safety |
| Styling | Tailwind CSS 3.4 + CSS variables | Utility-first design system |
| Fonts | Geist Sans + Geist Mono | Typography |
| Animations | Framer Motion 12.40 | Scroll/entry animations |
| Database | Supabase Postgres + pgvector | Vector storage + relational data |
| Auth | Supabase Auth | Google OAuth + email/password, cookie sessions, RLS per user |
| Embeddings | Gemini embedding-001 (768-d) | Vector embeddings |
| LLM | Gemini 2.5 Flash Lite | Chat, scoring, roadmaps |
| AI SDK | Vercel AI SDK 4.3 + @ai-sdk/google | Streaming, tool calls |
| Job Search | JSearch (RapidAPI) + Supabase cache + seed | Live search, cached to stay free-tier, honest seed fallback when no key/quota |
| DnD | @hello-pangea/dnd 18 | Kanban drag-and-drop |
| Charts | Recharts 2.13 | Dashboard statistics |
| Icons | Lucide React 1.16 | UI icons |
| Theme | next-themes 0.4 | Dark/light mode |

---

## 🔌 API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/cv/upload` | POST | Upload PDF/DOCX/TXT, parse, chunk, embed, store |
| `/api/cv/profile` | GET | Retrieve parsed CV chunks by section |
| `/api/jobs/search` | POST | Natural language job search + fit scoring |
| `/api/chat` | POST | Streaming AI assistant with RAG context + citation headers |
| `/api/roadmap` | POST | Generate structured learning roadmap |
| `/api/applications` | GET / POST / PATCH | CRUD for job applications |
| `/api/goals` | GET / PATCH | Goals and to-dos |
| `/api/health` | GET | Liveness probe |

---

## 🔑 Environment Variables

Create `.env.local` in the `careerpilot/` directory:

```env
# Google AI Studio — free tier, no billing — https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here

# Supabase — free project — https://supabase.com
# See SETUP.md §4 for auth provider configuration (Google OAuth + email/password)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# RapidAPI → JSearch — BASIC ($0) plan only — optional; falls back to seed data
RAPIDAPI_KEY=your_rapidapi_key_here
```

> **Cost:** every dependency runs on a free tier. **Do not enable billing** on any service — the worst case is a rate-limit (429), never a charge.

---

## 🛠️ Local Setup

```bash
# 1. Clone
git clone https://github.com/yourusername/careerpilot.git
cd careerpilot/careerpilot  # app lives in nested directory

# 2. Install dependencies
npm install

# 3. Set up Supabase
#    - Create a free project at https://supabase.com
#    - SQL Editor → paste & run supabase/migrations/0001_init.sql
#      (enables pgvector, creates tables + match_cv_chunks RPC + seed data)
#    - Then paste & run supabase/migrations/0002_auth.sql
#      (creates the auth trigger that auto-creates profiles on sign-up)

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# 5. Start dev server
npm run dev

# 6. Open browser
open http://localhost:3000
```

---

## 📜 Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (Next.js 15) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run eval` | Run evaluation suite against dev server |

---

## 🧪 Evaluation Suite

Run the test suite against a running dev server. The routes are auth-protected,
so set `EVAL_SECRET` in `.env.local` first (any random string) — the suite sends
it as a dev-only header that authenticates as the seeded eval user. This bypass
is disabled in production. See [`SETUP.md`](SETUP.md) §7.

```bash
# .env.local → EVAL_SECRET=some-random-dev-string
npm run dev      # terminal 1 — start dev server
npm run eval     # terminal 2 — run 11 automated cases
```

Test cases cover:

| ID | What it verifies |
|----|------------------|
| EVAL-1 | Job search returns structured, fit-scored cards (0..100) |
| EVAL-2 | Fit score is deterministic (±5 on repeat) |
| EVAL-3 | Agent trace is exposed (proves tool-calling loop) |
| EVAL-4 | Assistant chat endpoint streams a response |
| EVAL-5 | Applications API round-trips (create → list) |
| EVAL-6 | Goals API returns seeded demo goals |
| EVAL-7 | Job cache works (repeat query is consistent) |
| EVAL-8 | Fit breakdown exposes all 5 factors (0..100) |
| EVAL-9 | Health endpoint returns `{ status: "ok" }` |
| EVAL-10 | Assistant intent routing returns a valid intent |
| EVAL-11 | Hallucination guard: says "not in your CV" for missing skills |

---

## 🎬 5-Minute Demo Flow

1. **Landing** — "Stop applying blindly" hook + trust signals (RAG-grounded, programmatic scoring, agentic AI)
2. **Upload CV** — Drag-and-drop PDF → watch chunks appear in section view
3. **Job Search** — "Remote React internship" → agent trace → scored cards → hover for 5-factor breakdown
4. **AI Coach** — "What skills am I missing?" → see **citation chips**: "Based on: Experience, Skills"
5. **Roadmap** — "3-month plan" → week-by-week with cited projects
6. **Tracker** — Drag application to Interviewing → dashboard updates instantly
7. **Architecture** — $0 stack, Gemini embeddings, LLM streaming, scaling to 10K users

---

## 📈 Scaling to 10,000 Users

| Item | Calculation | Cost/month |
|------|-------------|------------|
| Vector storage | 10K × 30 chunks × 768d × 4B ≈ 92MB | $0 (Supabase free tier) |
| Embeddings | Gemini embedding-001 API | ~$0.07/10K docs |
| LLM (Gemini Flash Lite) | ~320K requests | ~$28 |
| Hosting (Vercel Hobby) | 1 seat | $0 |
| **Per user** | | **~$0.007** |

Bottlenecks & mitigations:
- **LLM rate limits** → model choice is centralized in `lib/ai.ts` for a one-line swap to a Groq fallback; we run `gemini-2.5-flash-lite` for its higher free-tier quota, and every call handles 429s gracefully with a calm "AI is busy" message (automated provider failover is a planned next step, not yet wired)
- **CV ingestion timeout** → Background jobs (Inngest-ready architecture)
- **Vector latency** → pgvector HNSW index (good to ~1M chunks)

---

## ⚠️ Known Limitations

- **Authentication:** Now uses **real Supabase Auth** (Google OAuth + email/password). Users must sign up at `/signup` or sign in at `/login`. See `SETUP.md` for manual dashboard configuration steps.
- **Job Search:** Uses seed + cached job data with optional JSearch live search. No paid job board API required for demo.
- **Calendar:** Not yet built — no calendar view or events table ships today (a candidate for the tracker post-MVP).
- **LLM Fallback:** 429s are handled gracefully (calm "AI is busy" message); the provider is centralized in `lib/ai.ts` for a one-line Groq swap, but automatic failover is not yet implemented.

---

## 👥 Team

Built in 14 days for CodeSprint 2026 (IUT Computer Society · Poridhi.io).

- **Person A:** AI/Backend — RAG pipeline, LLM router, fit score algorithm
- **Person B:** Frontend/UI — Sidebar shell, DnD tracker, animations, design system

---

*See [`SETUP.md`](SETUP.md) for the team's living setup log, [`PROMPTS.md`](PROMPTS.md) for the prompt engineering artifacts, and [`docs/`](docs/) for the full system design documents.*
