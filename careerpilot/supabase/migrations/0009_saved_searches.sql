-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — saved job searches + new-match nudges
--  Run this AFTER 0008 in the Supabase SQL editor.
--
--  Saves a user's recurring job search so they can re-run it and get
--  nudged when new matches appear. seen_job_keys stores fingerprints
--  (sha1 of role+company+location) rather than raw API ids, so diffing
--  works regardless of data source (JSearch / cache / seed).
-- ════════════════════════════════════════════════════════════════════

create table if not exists saved_searches (
  id bigint primary key generated always as identity,
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null default '',
  query text not null,
  location text not null default '',
  seen_job_keys text[] not null default '{}',
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

-- Row-level security: each user sees only their own rows
alter table saved_searches enable row level security;

do $$ begin
  create policy "users can manage own saved searches"
    on saved_searches
    for all
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;
