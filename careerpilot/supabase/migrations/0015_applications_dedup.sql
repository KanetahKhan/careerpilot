-- CareerPilot — application deduplication constraint (P1)
-- Run this AFTER 0014 in the Supabase SQL editor.
--
-- Prevents duplicate (user_id, role, company) from being inserted,
-- replacing the JS-based dedup that loads ALL applications.

-- 1. Clean any existing duplicates (keeps the most recent by created_at)
delete from applications
where id in (
  select id from (
    select id, row_number() over (
      partition by user_id, lower(trim(role)), lower(trim(company))
      order by created_at desc
    ) as rn
    from applications
  ) dup
  where dup.rn > 1
);

-- 2. Add the unique constraint
alter table applications
  add constraint applications_user_role_company_key
  unique (user_id, lower(trim(role)), lower(trim(company)));
