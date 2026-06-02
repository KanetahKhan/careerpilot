-- CareerPilot — seed data for local dev
-- Run AFTER all migrations: psql -d careerpilot -f seed.sql

insert into profiles (id, full_name)
values ('00000000-0000-0000-0000-000000000001', 'Demo User')
on conflict (id) do nothing;

insert into goals (user_id, title, due_date)
values
  ('00000000-0000-0000-0000-000000000001', 'Apply to 5 jobs this week', current_date + 5),
  ('00000000-0000-0000-0000-000000000001', 'Finish DSA revision', current_date + 10)
on conflict do nothing;
