# SETUP.md — team setup log (living document)

> **This is the team's source of truth for getting the project running.**
> Whenever you change anything in `.env.local`, add a dependency, change a config
> file, or add a setup step (e.g. via Copilot / AI assistant), **update this file
> in the same commit.** That way the other person can pull, read this, and be
> running in minutes — no "works on my machine," no Slack archaeology.
>
> ⚠️ **Never paste real secret values here.** This file is committed to Git.
> List *which* keys are needed and *where to get them* — the actual values live
> only in each person's `.env.local` (which is git-ignored).

---

## 1. First-time setup (new team member, start here)

```bash
# clone & install
git clone <repo-url>
cd careerpilot
npm install

# create your local env file (never committed)
cp .env.example .env.local
# → fill in the keys listed in section 3 below

# set up the database (one time per Supabase project)
# open Supabase dashboard → SQL Editor → New query
# → paste the entire contents of supabase/migrations/0001_init.sql → Run

# run it
npm run dev          # http://localhost:3000

# verify (optional)
npm run eval         # runs the test suite against your dev server
```

If `npm run dev` works and the home page loads, you're set.

---

## 2. Shared accounts / who owns what

Fill this in so nobody re-creates services that already exist.

| Service | Who created it | Shared how |
|---------|----------------|------------|
| Supabase project | _e.g. chichi_ | URL + keys shared privately (NOT here) |
| Google AI Studio (Gemini key) | _each person uses their own free key_ | — |
| RapidAPI / JSearch | _optional_ | — |
| Vercel project | _____ | linked to the GitHub repo |
| GitHub repo | _____ | — |

> Tip: each teammate can use their **own** free Gemini key (avoids one key hitting
> rate limits for both of you). Everyone shares the **same** Supabase project so
> you see the same data.

---

## 3. Environment variables (what each key is & where to get it)

Copy these into your `.env.local`. Get values from the source listed — do **not**
write the real values in this file.

| Variable | Required? | Where to get it |
|----------|-----------|-----------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ yes | https://aistudio.google.com/apikey (free, no billing) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ yes | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ yes | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ yes | Supabase → Project Settings → API → service_role key (**server-only secret**) |
| `RAPIDAPI_KEY` | ⬜ optional | RapidAPI → JSearch → subscribe to **Basic ($0)** → copy key. Leave blank to use bundled seed jobs |
| `DEMO_USER_ID` | ✅ yes | keep the default in `.env.example` (matches the seeded profile) |

---

## 4. Gotchas / things that trip people up

- **Database not set up?** If pages load but uploads/jobs error, you probably
  skipped running `supabase/migrations/0001_init.sql`. Run it in the SQL editor.
- **pgvector error?** The migration runs `create extension vector;` — if it fails,
  enable the "vector" extension under Supabase → Database → Extensions, then re-run.
- **Gemini 429 (rate limit):** you hit the free-tier cap. Mitigations already in
  place: the chat model is `gemini-2.5-flash-lite` (higher free quota), CV skills
  are extracted once per search instead of per job, and the UI shows a calm
  "AI is busy — please wait a few seconds and try again" notice instead of a red
  error. If you still hit it, wait for the reset or use your own separate key. We
  do **not** enable billing anywhere.
- **`.env.local` not loading?** Restart `npm run dev` after editing env files.
- **Fonts / build error about Google Fonts:** only happens with no internet; works
  fine on Vercel and normal connections.

---

## 5. Deployment (Vercel)

1. Push to GitHub.
2. Import the repo at vercel.com → it auto-detects Next.js.
3. Add **all** the env vars from section 3 in Vercel → Project → Settings →
   Environment Variables (the same keys you put in `.env.local`).
4. Deploy. Re-deploy after adding new env vars.

> Whoever sets up Vercel: note the live URL here → **Live URL: _____**

---

## 6. CI & local checks (DevOps)

Continuous integration runs in GitHub Actions (`.github/workflows/ci.yml`) on every
push to `main` and every PR. It mirrors the checks you should run locally before
committing:

```bash
npm run lint        # ESLint (eslint-config-next)
npx tsc --noEmit    # TypeScript typecheck
npm run build       # next build
```

If the CI badge at the top of the README is green, `main` lints, typechecks, and
builds. The app deploys as a single Next.js app on Vercel — no separate backend.

Health probe: `GET /api/health` → `{ status: "ok", time, uptime, version }`. It is
dependency-free (no Supabase/Gemini), so it reflects web-tier liveness for uptime
monitors and never fails on a free-tier rate limit.

---

## 7. Change log (append a line whenever you change setup)

Newest at the top. Format: `YYYY-MM-DD — name — what changed`.

- 2026-05-25 — quota — chat model → `gemini-2.5-flash-lite` (embeddings unchanged);
  fit-score extracts CV skills once per request (not per job); rate-limit (429)
  errors now show a calm "AI is busy" message. No new env vars.
- 2026-05-25 — features — reorganized `lib/` into five documented domain services;
  5-factor fit score (added education + location); assistant intent routing +
  structured `/roadmap`; CV `/profile` view + guided `/onboarding`; job detail modal.
  No new env vars or migration changes.
- 2026-05-25 — devops — added GitHub Actions CI (lint + typecheck + build), ESLint
  config, `/api/health` endpoint, and a repo-root `.gitignore`. No new env vars.
- 2026-05-24 — (initial) — project scaffolded; env vars + DB migration documented.
- _e.g. 2026-05-25 — chichi — added TAVILY_API_KEY for the agent web-search fallback; add it to .env.local and Vercel._
-added RAPIDAPI_KEY