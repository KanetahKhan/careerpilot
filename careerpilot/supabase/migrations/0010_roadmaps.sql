-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — persistent, trackable roadmaps
--  Run this AFTER 0001..0009 in the Supabase SQL editor.
--
--  Stores the user's generated roadmap plus per-item completion state.
--  Each user has at most ONE active roadmap at a time (is_active=true);
--  /api/roadmap POST flips the previous active row to false before
--  inserting a new one. Completion is a jsonb map of stable item keys
--  (e.g. "w1-a0", "w3-m") → boolean so a refresh restores progress
--  and the dashboard can compute % complete in TypeScript.
-- ════════════════════════════════════════════════════════════════════

create table if not exists roadmaps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  goal        text not null,
  summary     text not null default '',
  plan        jsonb not null,
  completed   jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

create index if not exists roadmaps_user_active_idx
  on roadmaps (user_id, is_active, created_at desc);

alter table roadmaps enable row level security;

do $$
begin
  execute 'create policy "own roadmaps" on roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
exception when duplicate_object then null;
end $$;
