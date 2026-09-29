    -- Isolated migration for serializing delete-and-recreate signup flows.
    -- Review and run separately from all other migrations.
    -- This does not delete users and does not schedule any job.

    alter table public.signup_tz_attempts
    add column if not exists lease_token uuid,
    add column if not exists lease_until timestamptz;

    create or replace function public.acquire_signup_tz_lease(
    p_tz_hash text,
    p_lease_token uuid,
    p_lease_seconds integer default 60
    )
    returns boolean
    language plpgsql
    security definer
    set search_path = public
    as $$
    declare
    v_lease_until timestamptz;
    begin
    if p_tz_hash is null or p_tz_hash = '' then
        raise exception 'tz hash is required';
    end if;

    if p_lease_token is null or p_lease_seconds <= 0 then
        raise exception 'invalid lease configuration';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_tz_hash, 0));

    select lease_until
    into v_lease_until
    from public.signup_tz_attempts
    where tz_hash = p_tz_hash
    for update;

    if not found then
        insert into public.signup_tz_attempts (
        tz_hash,
        window_started_at,
        attempt_count,
        last_attempt_at,
        lease_token,
        lease_until
        )
        values (
        p_tz_hash,
        now(),
        0,
        now(),
        p_lease_token,
        now() + make_interval(secs => p_lease_seconds)
        );

        return true;
    end if;

    if v_lease_until is not null and v_lease_until > now() then
        return false;
    end if;

    update public.signup_tz_attempts
    set lease_token = p_lease_token,
        lease_until = now() + make_interval(secs => p_lease_seconds)
    where tz_hash = p_tz_hash;

    return true;
    end;
    $$;

    create or replace function public.release_signup_tz_lease(
    p_tz_hash text,
    p_lease_token uuid
    )
    returns boolean
    language plpgsql
    security definer
    set search_path = public
    as $$
    begin
    update public.signup_tz_attempts
    set lease_token = null,
        lease_until = null
    where tz_hash = p_tz_hash
        and lease_token = p_lease_token;

    return found;
    end;
    $$;

    revoke all on function public.acquire_signup_tz_lease(text, uuid, integer)
    from public, anon, authenticated;

    revoke all on function public.release_signup_tz_lease(text, uuid)
    from public, anon, authenticated;

    grant execute on function public.acquire_signup_tz_lease(text, uuid, integer)
    to service_role;

    grant execute on function public.release_signup_tz_lease(text, uuid)
    to service_role;
