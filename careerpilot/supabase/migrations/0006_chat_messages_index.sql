-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — chat_messages index for session history reads
--  Run this AFTER 0001..0005 in the Supabase SQL editor.
--
--  Backs GET /api/chat/history, which fetches a user's messages for a
--  single session_id ordered by created_at. The chat_messages table
--  (created in 0001_init.sql) already has created_at default now() —
--  this just adds the composite index that makes the lookup cheap.
-- ════════════════════════════════════════════════════════════════════

create index if not exists chat_messages_user_session_created_idx
  on chat_messages (user_id, session_id, created_at);
