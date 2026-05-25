-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — calendar events (Pillar 4)
--  Run this AFTER 0001_init.sql and 0002_auth.sql in the Supabase SQL editor.
--  Backs the month-view calendar: standalone events plus deadline/reminder
--  entries that can link to a goal or an application.
-- ════════════════════════════════════════════════════════════════════

create table if not exists events (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  title                  text not null,
  event_date             date not null,
  type                   text not null default 'custom', -- deadline | reminder | custom
  related_goal_id        uuid references goals(id) on delete set null,
  related_application_id uuid references applications(id) on delete set null,
  created_at             timestamptz default now()
);

create index if not exists events_user_idx on events (user_id);
create index if not exists events_date_idx on events (event_date);

-- ── Row-Level Security ──────────────────────────────────────────────
-- Mirrors the goals/applications tables: owner-only by auth.uid(). Server
-- routes use the service-role key (bypasses RLS) and scope every query by
-- user_id; this policy protects any direct anon-key access path.
alter table events enable row level security;

do $$
begin
  execute 'create policy "own events" on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
exception when duplicate_object then null;
end $$;
