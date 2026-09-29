-- Read-only inspection for the unverified-account cleanup.
-- This file does not create, alter, schedule, or delete anything.

-- 1. Confirm the live auth confirmation field and identify stale unverified users.
select
  id,
  email,
  created_at,
  email_confirmed_at,
  extract(epoch from (now() - created_at))::bigint as age_seconds,
  floor(extract(epoch from (now() - created_at)) / 60)::bigint as age_minutes
from auth.users
where email_confirmed_at is null
  and created_at < now() - interval '24 hours'
order by created_at asc;

-- 2. Confirm the profiles -> auth.users delete action.
select
  constraint_name,
  delete_rule,
  update_rule
from information_schema.referential_constraints
where constraint_name = 'profiles_id_fkey';

-- 3. Confirm every profile foreign key in the live database and its delete action.
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  rc.delete_rule,
  rc.update_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc
  on rc.constraint_schema = tc.constraint_schema
 and rc.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.constraint_schema = 'public'
  and tc.constraint_name in (
    select c.conname
    from pg_constraint c
    join pg_class child on child.oid = c.conrelid
    join pg_class parent on parent.oid = c.confrelid
    join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    where parent_ns.nspname = 'public'
      and parent.relname = 'profiles'
  )
order by tc.table_name, kcu.column_name;

-- 4. Check whether pg_cron is available. This is read-only.
select
  exists (
    select 1
    from pg_available_extensions
    where name = 'pg_cron'
  ) as pg_cron_available,
  exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) as pg_cron_enabled;
