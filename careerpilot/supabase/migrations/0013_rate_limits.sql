-- Per-user AI rate limiting.
-- The check_and_record_rate_limit RPC is atomic via pg_advisory_xact_lock so
-- concurrent serverless instances from the same user are serialised in Postgres
-- and the counter stays accurate with no shared in-process state.

create table if not exists ai_rate_limits (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null,
  created_at  timestamptz not null default now()
);

-- Fast lookup: per user+endpoint over a time window.
create index if not exists ai_rate_limits_lookup
  on ai_rate_limits (user_id, endpoint, created_at desc);

alter table ai_rate_limits enable row level security;
create policy "own rows" on ai_rate_limits
  for all using (auth.uid() = user_id);

-- Atomic sliding-window check + record.
-- Returns true  → request allowed (row inserted).
-- Returns false → limit exceeded (nothing written).
create or replace function check_and_record_rate_limit(
  p_user_id        uuid,
  p_endpoint       text,
  p_window_seconds int,
  p_max_requests   int
) returns boolean language plpgsql security definer as $$
declare
  v_count int;
begin
  -- Serialise concurrent calls from the same user+endpoint.
  -- pg_advisory_xact_lock releases automatically when the transaction ends.
  perform pg_advisory_xact_lock(
    hashtext(p_user_id::text),
    hashtext(p_endpoint)
  );

  -- Prune expired entries to keep the table lean.
  delete from ai_rate_limits
  where user_id  = p_user_id
    and endpoint = p_endpoint
    and created_at < now() - (p_window_seconds || ' seconds')::interval;

  -- All remaining rows fall within the window.
  select count(*) into v_count
  from ai_rate_limits
  where user_id  = p_user_id
    and endpoint = p_endpoint;

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into ai_rate_limits (user_id, endpoint)
  values (p_user_id, p_endpoint);

  return true;
end;
$$;
