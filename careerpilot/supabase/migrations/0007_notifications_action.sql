-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — actionable AI nudges
--  Run this AFTER 0001..0006 in the Supabase SQL editor.
--
--  Adds an optional structured action payload to notifications so a
--  nudge can carry a real follow-up (e.g. a Hunter search query) that
--  the UI turns into a one-click button. The column is nullable — older
--  rows and rule-based nudges without an action continue to work.
--
--  Shape (validated server-side, not by the DB):
--    { "type": "hunter_search", "query": "react frontend internship" }
-- ════════════════════════════════════════════════════════════════════

alter table notifications
  add column if not exists action jsonb;
