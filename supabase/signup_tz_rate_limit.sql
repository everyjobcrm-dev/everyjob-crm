-- Isolated migration for signup recovery rate limiting.
-- Review and run separately from unverified-account cleanup migrations.
-- This does not delete users or schedule any job.

create table if not exists public.signup_tz_attempts (
  tz_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz not null default now(),
  constraint signup_tz_attempts_count_check
    check (attempt_count >= 0)
);

alter table public.signup_tz_attempts enable row level security;

revoke all on public.signup_tz_attempts from public;
revoke all on public.signup_tz_attempts from anon;
revoke all on public.signup_tz_attempts from authenticated;

create or replace function public.consume_signup_tz_attempt(
  p_tz_hash text,
  p_window_seconds integer default 900,
  p_max_attempts integer default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_count integer;
  v_window_started_at timestamptz;
begin
  if p_tz_hash is null or p_tz_hash = '' then
    raise exception 'tz hash is required';
  end if;

  if p_window_seconds <= 0 or p_max_attempts <= 0 then
    raise exception 'invalid rate limit configuration';
  end if;

  -- Serialize attempts for the same hashed TZ, including the first attempt.
  perform pg_advisory_xact_lock(hashtextextended(p_tz_hash, 0));

  select attempt_count, window_started_at
  into v_attempt_count, v_window_started_at
  from public.signup_tz_attempts
  where tz_hash = p_tz_hash
  for update;

  if not found then
    insert into public.signup_tz_attempts (
      tz_hash,
      window_started_at,
      attempt_count,
      last_attempt_at
    )
    values (p_tz_hash, now(), 1, now());

    return true;
  end if;

  if now() >= v_window_started_at + make_interval(secs => p_window_seconds) then
    update public.signup_tz_attempts
    set window_started_at = now(),
        attempt_count = 1,
        last_attempt_at = now()
    where tz_hash = p_tz_hash;

    return true;
  end if;

  if v_attempt_count >= p_max_attempts then
    return false;
  end if;

  update public.signup_tz_attempts
  set attempt_count = attempt_count + 1,
      last_attempt_at = now()
  where tz_hash = p_tz_hash;

  return true;
end;
$$;

revoke all on function public.consume_signup_tz_attempt(text, integer, integer)
from public;

revoke all on function public.consume_signup_tz_attempt(text, integer, integer)
from anon;

revoke all on function public.consume_signup_tz_attempt(text, integer, integer)
from authenticated;

grant execute on function public.consume_signup_tz_attempt(text, integer, integer)
to service_role;
