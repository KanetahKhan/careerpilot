-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — auth trigger & profile auto-creation
--  Run this AFTER 0001_init.sql in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════

-- 1. Alter the profiles table so the PK matches auth.uid()
--    (the column already exists; we just remove the gen_random_uuid default
--     because auth.uid() supplies the id).
alter table profiles
  alter column id drop default;

-- 2. Function + trigger: auto-create a profile row whenever a new user signs up.
--    Idempotent — safe to re-run (on conflict do nothing).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
