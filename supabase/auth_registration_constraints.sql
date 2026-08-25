-- Run after resolving any existing duplicate values.
-- The application calls the ID-number column `tz`.

create unique index if not exists profiles_tz_unique_idx
  on public.profiles (tz)
  where tz is not null;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;