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
# → paste the entire contents of supabase/migrations/0002_auth.sql → Run
# → paste the entire contents of supabase/migrations/0003_events.sql → Run
# → paste the entire contents of supabase/migrations/0004_notifications.sql → Run

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
| `GROQ_API_KEY` | ⬜ recommended | https://console.groq.com/keys (free, no card). LLM fallback — see note below |
| `RAPIDAPI_KEY` | ⬜ optional | RapidAPI → JSearch → subscribe to **Basic ($0)** → copy key. Leave blank to use bundled seed jobs |

> **LLM fallback (Gemini → Groq).** Gemini Flash-Lite is the primary model. If any
> LLM call hits a rate-limit / quota error (429), the app **automatically retries
> the same operation on Groq** (`llama-3.3-70b-versatile`) — including the
> streaming assistant chat, which falls back to streaming from Groq. This covers
> the plan's "Gemini rate-limit mid-demo" critical risk. If `GROQ_API_KEY` is
> unset, the fallback is skipped and rate-limited calls show a calm "AI is busy"
> message instead. **Add `GROQ_API_KEY` in Vercel too** (Project → Settings →
> Environment Variables) so the deployed demo has the same safety net.

> `DEMO_USER_ID` has been removed — the app now uses **real Supabase Auth**.
> Every user gets their own account, and data is scoped per user via RLS.

---

## 4. Supabase Auth setup (manual dashboard steps)

The app uses **Supabase Auth** for email/password and Google OAuth sign-in.
After creating your Supabase project, you must enable these providers.

### 4a. Enable Email / Password auth

1. Open your Supabase dashboard → **Authentication** → **Providers**.
2. Click **Email** — it is enabled by default. Confirm it says **Enabled**.
3. Under **Confirm email** (the "Confirm email" toggle), make sure it is **On**
   so signups send a confirmation email (free tier includes email sending).
4. Optionally configure **SMTP** under Authentication → Settings → SMTP if you
   want to use your own email provider (not required for development).

### 4b. Enable Google OAuth (requires Google Cloud project)

To let users "Continue with Google", you need a Google Cloud OAuth client:

1. Go to the **[Google Cloud Console](https://console.cloud.google.com)**.
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
   - If you haven't configured the OAuth consent screen yet, do so first:
     - **User Type**: External (anyone with a Google account).
     - Fill in the required fields (app name, support email, developer contact).
     - Add `https://YOUR-PROJECT.supabase.co` as an Authorized Domain.
     - Add your own email as a test user.
5. Under **Application type**, choose **Web application**.
6. Add these **Authorized redirect URIs** (replace `YOUR-PROJECT` with your actual Supabase project ref):
   - `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
7. Copy the generated **Client ID** and **Client Secret**.

Back in the Supabase dashboard:
1. **Authentication** → **Providers** → **Google** → **Enabled**.
2. Paste the **Client ID** and **Client Secret** from Google Cloud.
3. Click **Save**.

That's it — Google sign-in works on both localhost and production.

### 4c. Site URL configuration

1. Supabase dashboard → **Authentication** → **Settings** → **URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` (for development).
3. Add `http://localhost:3000/**` and `https://your-vercel-app.vercel.app/**` to
   **Redirect URLs**.
4. Add `http://localhost:3000` and `https://your-vercel-app.vercel.app` to
   **Additional redirect URLs**.

---

## 5. Gotchas / things that trip people up

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
- **Redirect loop after login?** Make sure the `redirectTo` URL in the login page
  matches your Supabase "Site URL" configuration (see 4c above).
- **Google sign-in not working?** Double-check the OAuth Client ID/Secret and the
  Authorized Redirect URIs in both Google Cloud Console and Supabase.
- **Email confirmation not sending?** Supabase's free tier includes email. If it's
  not arriving, check the spam folder and verify "Confirm email" is enabled in
  Authentication → Providers → Email.

---

## 6. Deployment (Vercel)

1. Push to GitHub.
2. Import the repo at vercel.com → it auto-detects Next.js.
3. Add **all** the env vars from section 3 in Vercel → Project → Settings →
   Environment Variables (the same keys you put in `.env.local`).
4. Deploy. Re-deploy after adding new env vars.
5. Update the Supabase **Site URL** and **Redirect URLs** to point to your
   Vercel deployment URL (see 4c above).

> Whoever sets up Vercel: note the live URL here → **Live URL: _____**

---

## 7. CI & local checks (DevOps)

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

### Running the eval suite (`npm run eval`)

The API routes require an authenticated user, but the eval suite runs without a
browser session. To let it through **in development only**, set `EVAL_SECRET` in
`.env.local` to any random string. The suite sends it as an `x-eval-secret`
header, and `lib/auth.ts` then treats the request as the seeded eval user
(`00000000-0000-0000-0000-000000000001`, created by `0001_init.sql`).

```bash
# .env.local
EVAL_SECRET=some-random-dev-string
```

Then:

```bash
npm run dev      # terminal 1
npm run eval     # terminal 2 — should print a PASS table
```

This bypass is safe: it is **disabled in production** (`NODE_ENV` guard) and a
real browser never sends the header, so it cannot affect live user sessions. If
`EVAL_SECRET` is unset, the suite warns you and the authed cases will fail.

---

## 8. Change log (append a line whenever you change setup)

Newest at the top. Format: `YYYY-MM-DD — name — what changed`.

- 2026-05-25 — nudges — added Pillar 4 AI nudges. New `notifications` table
  (**run `supabase/migrations/0004_notifications.sql`**), `/api/nudges` route
  (GET/POST/PATCH), and a "Generate today's nudges" panel on the Tracker. POST
  reads the user's real applications/goals/CV-presence and makes ONE LLM call
  (Gemini→Groq fallback) to write 2-4 grounded nudges; degrades to deterministic
  rule-based nudges if AI is unavailable. No new dependencies.
- 2026-05-25 — calendar — added Pillar 4 month-view calendar in the Tracker
  (Board/Calendar tabs). New `events` table (**run `supabase/migrations/0003_events.sql`
  in the Supabase SQL editor**), `/api/events` route (GET/POST/DELETE), and a
  custom calendar component that plots events + goal due dates + application dates.
  No new dependencies.
- 2026-05-25 — ai — added automatic Gemini→Groq fallback on rate-limit (429) for
  every LLM call (chat stream, fit-score skill extraction, job-hunter agent,
  roadmap, intent). New dep `@ai-sdk/groq`; new env var `GROQ_API_KEY` (also add
  it in Vercel). Embeddings stay on Gemini. If both providers fail, the UI shows
  a calm "AI is busy" message.
- 2026-05-25 — eval — fixed the eval suite for real auth: routes now require a
  session, so the suite sends a dev-only `x-eval-secret` header that `lib/auth.ts`
  maps to the seeded eval user. New env var `EVAL_SECRET` (optional `EVAL_USER_ID`).
  Eval loads `.env.local` via `@next/env`. No production impact (NODE_ENV guard).
- 2026-05-25 — auth — added real user auth via Supabase Auth (Google OAuth +
  email/password). Replaced `DEMO_USER_ID` with per-user auth. Added `/login`,
  `/signup`, middleware, auth trigger migration (`0002_auth.sql`). Removed
  `DEMO_USER_ID` env var. See section 4 for manual configuration steps.
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
