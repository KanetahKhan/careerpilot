-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — remediation: search_path, indexes, constraints, triggers
--  Safe to re-run (all IF NOT EXISTS / OR REPLACE).
-- ════════════════════════════════════════════════════════════════════

-- 1. Fix match_cv_chunks search_path (must be fully qualified)
create or replace function public.match_cv_chunks (
  p_user_id      uuid,
  query_embedding vector(768),
  match_count    int default 5
)
returns table (
  id         bigint,
  section    text,
  content    text,
  similarity float
)
language sql
stable
set search_path = ''
as $$
  select
    c.id,
    c.section,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.cv_chunks c
  where c.user_id = p_user_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 2. Missing indexes on foreign keys
create index if not exists idx_applications_user_id on applications(user_id);
create index if not exists idx_cv_documents_user_id on cv_documents(user_id);
create index if not exists idx_goals_user_id on goals(user_id);
create index if not exists idx_saved_searches_user_id on saved_searches(user_id);

-- 3. CHECK constraints on enum-like columns
alter table applications add constraint if not exists chk_status
  check (status in ('applied','interviewing','offer','rejected','withdrawn'));

alter table events add constraint if not exists chk_event_type
  check (type in ('interview','deadline','follow_up','offer','rejection'));

alter table notifications add constraint if not exists chk_notification_type
  check (type in ('apply','goal','skill','general'));

alter table chat_messages add constraint if not exists chk_chat_role
  check (role in ('user','assistant'));

alter table cv_chunks add constraint if not exists chk_cv_section
  check (section in ('summary','experience','education','projects','skills','certifications','extracurricular','publications','unknown'));

-- 4. updated_at trigger function (idempotent)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers to mutable tables
create trigger if not exists update_updated_at
  before update on cv_documents
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on cv_chunks
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on goals
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on events
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on notifications
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on role_benchmarks
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on saved_searches
  for each row execute function public.update_updated_at_column();

create trigger if not exists update_updated_at
  before update on roadmaps
  for each row execute function public.update_updated_at_column();
