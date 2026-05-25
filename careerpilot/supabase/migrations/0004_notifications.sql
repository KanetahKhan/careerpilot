-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — AI nudges / notifications (Pillar 4)
--  Run this AFTER 0001..0003 in the Supabase SQL editor.
--  Backs the "Generate today's nudges" feature: proactive, data-grounded
--  reminders generated from the user's real tracker data.
-- ════════════════════════════════════════════════════════════════════

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  message     text not null,
  type        text not null default 'general', -- apply | goal | skill | general
  read        boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_idx on notifications (user_id);

-- ── Row-Level Security ──────────────────────────────────────────────
-- Mirrors the goals/applications/events tables: owner-only by auth.uid().
-- Server routes use the service-role key (bypasses RLS) and scope every query
-- by user_id; this policy protects any direct anon-key access path.
alter table notifications enable row level security;

do $$
begin
  execute 'create policy "own notifications" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
exception when duplicate_object then null;
end $$;
