-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — initial schema
--  Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--  It is idempotent-ish: safe to re-run during development.
-- ════════════════════════════════════════════════════════════════════

-- 1. Enable pgvector (Supabase ships it; this just turns it on)
create extension if not exists vector;

-- ── Profiles (one row per user; demo mode uses a single seeded row) ──
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  full_name   text,
  created_at  timestamptz default now()
);

-- ── CV documents (raw uploaded files, metadata only) ──
create table if not exists cv_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  file_name   text not null,
  raw_text    text,
  created_at  timestamptz default now()
);

-- ── CV chunks (the RAG store) — gemini-embedding-001 truncated to 768-d ──
create table if not exists cv_chunks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  document_id uuid references cv_documents(id) on delete cascade,
  section     text,                 -- experience | education | skills | projects | summary | other
  content     text not null,
  position    int default 0,
  embedding   vector(768),
  created_at  timestamptz default now()
);

-- HNSW index for fast cosine search. Build AFTER you have data for best results,
-- but creating it empty is fine for a hackathon.
create index if not exists cv_chunks_embedding_idx
  on cv_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists cv_chunks_user_idx on cv_chunks (user_id);

-- ── Retrieval RPC: top-k most similar chunks for a user ──
-- Returns cosine similarity (1 - distance) so higher = better.
create or replace function match_cv_chunks (
  p_user_id      uuid,
  query_embedding vector(768),
  match_count    int default 5
)
returns table (
  id         bigint,
  section    text,
  content    text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.section,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from cv_chunks c
  where c.user_id = p_user_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Job cache (so the JSearch free tier never runs dry in the demo) ──
create table if not exists job_cache (
  id          bigint generated always as identity primary key,
  query_hash  text unique not null,   -- hash of {query, location}
  payload     jsonb not null,         -- raw structured job array
  created_at  timestamptz default now()
);

-- ── Application tracker (Kanban) ──
create table if not exists applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null,
  company     text not null,
  location    text,
  fit_score   int,                    -- 0..100, computed
  status      text not null default 'applied', -- applied|interviewing|offer|rejected
  link        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Goals & to-dos ──
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  due_date    date,
  done        boolean default false,
  created_at  timestamptz default now()
);

-- ── Chat sessions (assistant memory persisted on finish) ──
create table if not exists chat_messages (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  session_id  text not null,
  role        text not null,          -- user|assistant
  content     text not null,
  created_at  timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════════
--  Row-Level Security
--  Demo mode talks to the DB with the SERVICE ROLE key (server-side only),
--  which bypasses RLS. The policies below are the PRODUCTION path: when you
--  switch to Supabase Auth, every table is already scoped to auth.uid().
-- ════════════════════════════════════════════════════════════════════
alter table profiles      enable row level security;
alter table cv_documents  enable row level security;
alter table cv_chunks     enable row level security;
alter table applications  enable row level security;
alter table goals         enable row level security;
alter table chat_messages enable row level security;

-- Owner-only policies (used once real auth is wired)
do $$
begin
  perform 1;
  -- profiles
  execute 'create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id)';
  -- per-user tables
  execute 'create policy "own cv_documents" on cv_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'create policy "own cv_chunks" on cv_chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'create policy "own applications" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'create policy "own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  execute 'create policy "own chat" on chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
exception when duplicate_object then null;
end $$;

