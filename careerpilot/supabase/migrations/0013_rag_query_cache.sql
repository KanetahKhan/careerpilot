-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — RAG query cache (P0)
--  Run this AFTER 0012 in the Supabase SQL editor.
--
--  Caches the top-k retrieval results for a (user_id, query_hash)
--  pair with a 5-minute TTL. Avoids redundant embedding + vector
--  search when the user rapidly repeats or refines a question.
-- ════════════════════════════════════════════════════════════════════

create table if not exists rag_query_cache (
  id         bigserial primary key,
  user_id    text not null,
  query_hash text not null,
  results    jsonb not null,
  created_at timestamptz default now(),
  unique (user_id, query_hash)
);

create index if not exists idx_rag_query_cache_lookup
  on rag_query_cache (user_id, query_hash);

create index if not exists idx_rag_query_cache_created_at
  on rag_query_cache (created_at);
