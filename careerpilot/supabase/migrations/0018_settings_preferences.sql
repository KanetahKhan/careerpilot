-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — user preferences (notification & privacy settings)
--
--  Adds a `preferences` JSONB column to the `profiles` table to
--  store user settings without a separate table or joins.
-- ════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists preferences jsonb default '{}'::jsonb;
