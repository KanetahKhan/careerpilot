-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — role benchmark profiles for skill-gap analysis
--  Run this AFTER 0007 in the Supabase SQL editor.
--
--  Each row is a canonical "what this role typically requires" profile
--  used to compare against the user's CV and produce a coverage ratio
--  plus explicit have / missing skill lists.
--
--  role_slug is the unique key for ILIKE matching (lookup normalises
--  input to slug form). role_label is a human-readable display name.
--  Rows with source='seed' are shipped; source='llm' are generated on
--  demand and cached by the benchmark resolver.
-- ════════════════════════════════════════════════════════════════════

create table if not exists role_benchmarks (
  id bigint primary key generated always as identity,
  role_slug text not null unique,
  role_label text not null,
  skills text[] not null default '{}',
  source text not null default 'seed',
  created_at timestamptz not null default now()
);

-- Seed ~10 common targets with curated skill lists (lowercase).
insert into role_benchmarks (role_slug, role_label, skills) values
  ('ml-engineer',              'ML Engineer',
   '{python,tensorflow,pytorch,machine learning,deep learning,nlp,computer vision,mlops,docker,kubernetes,sql,git}'),
  ('data-engineer',            'Data Engineer',
   '{python,sql,postgresql,etl,pipeline,spark,airflow,docker,aws,gcp,git,data modeling}'),
  ('frontend-engineer',        'Frontend Engineer',
   '{react,typescript,javascript,css,html,git,rest api,testing,jest,webpack,tailwind,nextjs}'),
  ('backend-engineer',         'Backend Engineer',
   '{node.js,python,java,sql,postgresql,rest api,git,docker,testing,api design,redis,aws}'),
  ('fullstack-engineer',       'Full-Stack Engineer',
   '{react,typescript,javascript,node.js,sql,postgresql,git,docker,rest api,css,html,testing}'),
  ('devops-engineer',          'DevOps Engineer',
   '{docker,kubernetes,aws,gcp,ci/cd,terraform,ansible,linux,git,python,bash,monitoring}'),
  ('data-scientist',           'Data Scientist',
   '{python,r,sql,machine learning,statistics,deep learning,tensorflow,pytorch,pandas,numpy,visualization,git}'),
  ('mobile-engineer',          'Mobile Engineer (RN)',
   '{swift,kotlin,react native,flutter,javascript,typescript,git,rest api,testing,firebase}'),
  ('embedded-robotics',        'Embedded / Robotics Engineer',
   '{c,c++,python,embedded,rtos,ros,i2c,spi,linux,fpga,git,signal processing}'),
  ('swe-intern',               'SWE Intern (general)',
   '{python,java,data structures,algorithms,debugging,git,sql,linux,rest api,testing,teamwork}')
on conflict (role_slug) do nothing;
