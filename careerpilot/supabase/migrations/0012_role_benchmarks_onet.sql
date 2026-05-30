-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — extend role_benchmarks to record O*NET provenance.
--  Run this AFTER 0011 in the Supabase SQL editor.
--
--  Additive only: new columns are nullable and the existing `source`
--  column simply gains a new allowed value 'onet' (no constraint to
--  alter — `source` is a free-text column with a default).
--
--  - onet_soc:    O*NET-SOC code (e.g. '15-1254.00') for telemetry +
--                 quick re-fetch / cross-reference.
--  - onet_title:  Canonical O*NET occupation title as returned by the
--                 search endpoint.
--  - fetched_at:  When this row was last sourced from O*NET (for
--                 future cache-refresh policy; O*NET releases yearly).
-- ════════════════════════════════════════════════════════════════════

alter table role_benchmarks
  add column if not exists onet_soc text,
  add column if not exists onet_title text,
  add column if not exists fetched_at timestamptz;

create index if not exists idx_role_benchmarks_onet_soc
  on role_benchmarks (onet_soc);
