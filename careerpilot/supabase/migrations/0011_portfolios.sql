-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — shareable public portfolios
--  Run this AFTER 0001..0010 in the Supabase SQL editor.
--
--  One portfolio per user (user_id unique). `data` is a self-contained
--  jsonb snapshot built from the user's already-parsed CV — it is the
--  ONLY thing the public page reads, so nothing private leaks beyond the
--  intended-public fields (raw contact info is opt-in at generate time).
--
--  RLS keeps the row OWNER-only. The public page at /p/[slug] reads the
--  snapshot server-side via the SERVICE-ROLE admin client (bypasses RLS)
--  filtered to published=true, so no public RLS policy is needed.
-- ════════════════════════════════════════════════════════════════════

create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references profiles(id) on delete cascade,
  slug        text not null unique,
  data        jsonb not null,
  published   boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- The public page looks up published portfolios by slug.
create index if not exists portfolios_slug_published_idx
  on portfolios (slug, published);

alter table portfolios enable row level security;

do $$
begin
  execute 'create policy "own portfolios" on portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
exception when duplicate_object then null;
end $$;
