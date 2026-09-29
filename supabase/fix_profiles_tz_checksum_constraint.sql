-- Fix Israeli ID checksum check constraint in public.profiles
-- The previous constraint added raw products for even positions (e.g. 5*2=10, 7*2=14)
-- instead of reducing digits greater than 9 (e.g. 10 - 9 = 1, 14 - 9 = 5),
-- which caused valid IDs to fail the database check and trigger a 500 error during signup.

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_tz_checksum_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_tz_checksum_check
CHECK (
  tz IS NULL OR (
    tz ~ '^[0-9]{8,9}$' AND (
      (
        (substring(lpad(tz, 9, '0'), 1, 1)::integer * 1) +
        (CASE WHEN substring(lpad(tz, 9, '0'), 2, 1)::integer * 2 > 9 THEN substring(lpad(tz, 9, '0'), 2, 1)::integer * 2 - 9 ELSE substring(lpad(tz, 9, '0'), 2, 1)::integer * 2 END) +
        (substring(lpad(tz, 9, '0'), 3, 1)::integer * 1) +
        (CASE WHEN substring(lpad(tz, 9, '0'), 4, 1)::integer * 2 > 9 THEN substring(lpad(tz, 9, '0'), 4, 1)::integer * 2 - 9 ELSE substring(lpad(tz, 9, '0'), 4, 1)::integer * 2 END) +
        (substring(lpad(tz, 9, '0'), 5, 1)::integer * 1) +
        (CASE WHEN substring(lpad(tz, 9, '0'), 6, 1)::integer * 2 > 9 THEN substring(lpad(tz, 9, '0'), 6, 1)::integer * 2 - 9 ELSE substring(lpad(tz, 9, '0'), 6, 1)::integer * 2 END) +
        (substring(lpad(tz, 9, '0'), 7, 1)::integer * 1) +
        (CASE WHEN substring(lpad(tz, 9, '0'), 8, 1)::integer * 2 > 9 THEN substring(lpad(tz, 9, '0'), 8, 1)::integer * 2 - 9 ELSE substring(lpad(tz, 9, '0'), 8, 1)::integer * 2 END) +
        (substring(lpad(tz, 9, '0'), 9, 1)::integer * 1)
      ) % 10 = 0
    )
  )
);
