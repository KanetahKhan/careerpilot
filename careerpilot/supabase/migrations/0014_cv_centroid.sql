-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — CV centroid pre-computation (P1)
--  Run this AFTER 0013 in the Supabase SQL editor.
--
--  Stores the mean embedding vector for all chunks in a CV document
--  so the fit-score route can read it directly instead of loading
--  and averaging every chunk's embedding on every request.
--
--  The IVFFlat index accelerates future centroid-based queries;
--  populated lazily as centroid_embedding is written at ingest time.
-- ════════════════════════════════════════════════════════════════════

alter table cv_documents
  add column if not exists centroid_embedding vector(768);

create index if not exists idx_cv_documents_centroid
  on cv_documents using ivfflat (centroid_embedding vector_cosine_ops);
