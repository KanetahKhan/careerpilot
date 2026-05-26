-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — editable profile (display name + avatar)
--  Run this AFTER 0001..0004 in the Supabase SQL editor.
--
--  Adds display_name / avatar_url / updated_at to the existing `profiles`
--  table (created in 0001_init.sql, repointed to auth.uid() in 0002_auth.sql),
--  and provisions a public `avatars` storage bucket with per-user RLS so a
--  signed-in user can only write objects under `<auth.uid()>/...`.
--
--  Note: the auto-create-profile-on-signup trigger already exists in
--  0002_auth.sql (handle_new_user → on_auth_user_created), so nothing new is
--  needed there. The GET /api/profile route also creates the row lazily.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Profile columns ──────────────────────────────────────────────
-- Idempotent: the `profiles` table is created in 0001_init.sql; this just
-- ensures the editable fields exist. The id column already references the
-- auth user via the handle_new_user trigger; we don't add a hard FK to
-- auth.users because legacy demo seed data may not have a matching row.
create table if not exists profiles (
  id          uuid primary key,
  created_at  timestamptz default now()
);

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_url   text;
alter table profiles add column if not exists updated_at   timestamptz default now();

-- RLS is already enabled in 0001_init.sql with an "own profile" policy
-- (auth.uid() = id) covering select/insert/update/delete. Re-assert defensively.
alter table profiles enable row level security;

do $$
begin
  execute 'create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id)';
exception when duplicate_object then null;
end $$;

-- ── 2. Avatar storage bucket (public read) ──────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- ── 3. Storage RLS ──────────────────────────────────────────────────
-- Path convention: `<auth.uid()>/<timestamp>.<ext>`. The first folder segment
-- must match auth.uid() for writes; reads are unrestricted (bucket is public).
do $$
begin
  execute $p$create policy "avatars public read"
    on storage.objects for select
    using (bucket_id = 'avatars')$p$;
exception when duplicate_object then null;
end $$;

do $$
begin
  execute $p$create policy "avatars owner insert"
    on storage.objects for insert
    with check (
      bucket_id = 'avatars'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    )$p$;
exception when duplicate_object then null;
end $$;

do $$
begin
  execute $p$create policy "avatars owner update"
    on storage.objects for update
    using (
      bucket_id = 'avatars'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )$p$;
exception when duplicate_object then null;
end $$;

do $$
begin
  execute $p$create policy "avatars owner delete"
    on storage.objects for delete
    using (
      bucket_id = 'avatars'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    )$p$;
exception when duplicate_object then null;
end $$;
