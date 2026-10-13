-- p1_m0b: remove anonymous and over-broad access to PII views (anon could read tz/email/phone through owner-rights views).
-- profiles_with_age and profiles_public are unused by the app.
REVOKE ALL ON public.profiles_with_age, public.profiles_public, public.v_shift_submissions_dashboard FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.profiles_with_age, public.profiles_public, public.v_shift_submissions_dashboard FROM authenticated;
REVOKE SELECT ON public.profiles_with_age, public.profiles_public FROM authenticated;

-- ROLLBACK:
--   GRANT ALL ON public.profiles_with_age, public.profiles_public, public.v_shift_submissions_dashboard TO anon, authenticated;
