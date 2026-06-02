-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — soft delete support for mutable tables
--  Safe to re-run (all IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

alter table applications add column if not exists deleted_at timestamptz;
alter table cv_documents add column if not exists deleted_at timestamptz;
alter table goals add column if not exists deleted_at timestamptz;
alter table events add column if not exists deleted_at timestamptz;
alter table notifications add column if not exists deleted_at timestamptz;
alter table saved_searches add column if not exists deleted_at timestamptz;
