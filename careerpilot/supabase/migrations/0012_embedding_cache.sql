-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — embedding cache for CV chunk vectors (P0)
--  Run this AFTER 0011 in the Supabase SQL editor.
--
--  Caches Gemini embedding-001 vectors keyed by SHA-256 hash of the
--  source text. On re-ingest, chunks whose content hasn't changed
--  skip the embedding API call entirely. The index on created_at
--  supports the optional TTL cleanup (30-day expiry).
-- ════════════════════════════════════════════════════════════════════

create table if not exists embedding_cache (
  hash       text primary key,
  vector     vector(768) not null,
  created_at timestamptz default now()
);

create index if not exists idx_embedding_cache_created_at
  on embedding_cache (created_at);
