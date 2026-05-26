-- ════════════════════════════════════════════════════════════════════
--  CareerPilot — role benchmark profiles for skill-gap analysis
--  Run this AFTER 0007 in the Supabase SQL editor.
--
--  Each row is a canonical "what this role typically requires" profile
--  used to compare against the user's CV and produce a coverage ratio
--  plus explicit have / missing / extra skill lists.
--
--  Rows with source='seed' are shipped with the app; rows with
--  source='llm' are generated on demand and cached by the benchmark
--  resolver (lib/services/profile/benchmarks.ts).
-- ════════════════════════════════════════════════════════════════════

create table if not exists role_benchmarks (
  id bigint primary key generated always as identity,
  role_title text not null unique,
  skills text[] not null default '{}',
  seniority_years int not null default 0,
  education_level text,
  common_tools text[] not null default '{}',
  source text not null default 'seed',
  created_at timestamptz not null default now()
);

-- Seed ~10 common roles
insert into role_benchmarks (role_title, skills, seniority_years, education_level, common_tools) values
  ('frontend engineer',           '{react,typescript,javascript,css,html,git,rest api,testing,jest,webpack,tailwind,nextjs}',      2, 'bachelor''s',  '{react,typescript,nextjs,tailwind}'),
  ('backend engineer',            '{node.js,python,java,sql,postgresql,rest api,git,docker,testing,api design,redis,aws}',         3, 'bachelor''s',  '{node.js,postgresql,docker,aws}'),
  ('full stack engineer',         '{react,typescript,javascript,node.js,sql,postgresql,git,docker,rest api,css,html,testing}',     3, 'bachelor''s',  '{react,node.js,postgresql,docker}'),
  ('data scientist',              '{python,r,sql,machine learning,statistics,deep learning,tensorflow,pytorch,pandas,numpy,visualization,git}', 2, 'master''s', '{python,pandas,pytorch,jupyter}'),
  ('data engineer',               '{python,sql,postgresql,etl,pipeline,spark,airflow,docker,aws,gcp,git,data modeling}',            3, 'bachelor''s',  '{python,spark,airflow,aws}'),
  ('devops engineer',             '{docker,kubernetes,aws,gcp,ci/cd,terraform,ansible,linux,git,python,bash,monitoring}',          3, 'bachelor''s',  '{docker,kubernetes,aws,terraform}'),
  ('mobile engineer',             '{swift,kotlin,react native,flutter,javascript,typescript,git,rest api,testing,firebase}',       2, 'bachelor''s',  '{swift,kotlin,react native,flutter}'),
  ('product manager',             '{roadmap,stakeholder,agile,analytics,user research,a/b testing,strategy,communication,jira}',   3, 'bachelor''s',  '{jira,analytics,agile}'),
  ('machine learning engineer',   '{python,tensorflow,pytorch,machine learning,deep learning,nlp,computer vision,mlops,docker,kubernetes,sql,git}', 3, 'master''s', '{python,pytorch,tensorflow,mlops}'),
  ('ux designer',                 '{figma,user research,wireframing,prototyping,design systems,usability testing,interaction design,visual design}', 2, 'bachelor''s', '{figma,prototyping,design systems}')
on conflict (role_title) do nothing;
