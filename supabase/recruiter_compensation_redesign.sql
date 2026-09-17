BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN recruiter_bonus_rate numeric
    DEFAULT 1
    CHECK (recruiter_bonus_rate >= 0);

ALTER TABLE public.events
  ADD COLUMN recruiter_id uuid
    REFERENCES public.profiles(id);

CREATE INDEX events_recruiter_id_idx
  ON public.events(recruiter_id);

ALTER TABLE public.recruiter_bonuses
  ADD COLUMN employee_id uuid,
  ADD COLUMN event_id uuid,
  ADD COLUMN redeemed_at timestamp with time zone,
  ADD COLUMN redeemed_by uuid,
  ADD COLUMN redeemed_context_event_id uuid;

UPDATE public.recruiter_bonuses AS rb
SET
  employee_id = er.user_id,
  event_id = er.event_id
FROM public.event_registrations AS er
WHERE er.id = rb.source_registration_id;

UPDATE public.recruiter_bonuses AS rb
SET
  redeemed_at = COALESCE(rb.applied_at, rb.created_at),
  redeemed_context_event_id = applied_registration.event_id
FROM public.event_registrations AS applied_registration
WHERE rb.status::text = 'applied'
  AND applied_registration.id = rb.applied_to_registration_id;

ALTER TABLE public.recruiter_bonuses
  ALTER COLUMN employee_id SET NOT NULL,
  ALTER COLUMN event_id SET NOT NULL,
  ADD CONSTRAINT recruiter_bonuses_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT recruiter_bonuses_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id),
  ADD CONSTRAINT recruiter_bonuses_redeemed_by_fkey
    FOREIGN KEY (redeemed_by) REFERENCES public.profiles(id),
  ADD CONSTRAINT recruiter_bonuses_redeemed_context_event_id_fkey
    FOREIGN KEY (redeemed_context_event_id) REFERENCES public.events(id);

CREATE UNIQUE INDEX IF NOT EXISTS recruiter_bonuses_source_registration_id_uidx
  ON public.recruiter_bonuses(source_registration_id);

ALTER TABLE public.recruiter_bonuses
  DROP COLUMN applied_to_registration_id,
  DROP COLUMN applied_at,
  DROP COLUMN status;

CREATE OR REPLACE FUNCTION public.enforce_recruiter_bonus_rate_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recruiter_bonus_rate IS DISTINCT FROM OLD.recruiter_bonus_rate
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles
       WHERE id = auth.uid()
         AND role = 'admin'
     )
  THEN
    RAISE EXCEPTION
      'רק אדמין יכול לעדכן את תעריף זיכוי הגיוס של מגייס.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_recruiter_bonus_rate_admin_only
  BEFORE UPDATE OF recruiter_bonus_rate
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_recruiter_bonus_rate_admin_only();

CREATE OR REPLACE VIEW public.v_recruiter_pending_credits AS
SELECT
  p.id AS recruiter_id,
  p.first_name,
  p.last_name,
  p.recruiter_bonus_rate,
  COUNT(rb.id)::bigint AS pending_recruitment_count,
  COALESCE(SUM(rb.bonus_amount), 0)::numeric AS pending_recruitment_amount
FROM public.profiles AS p
LEFT JOIN public.recruiter_bonuses AS rb
  ON rb.recruiter_id = p.id
 AND rb.redeemed_at IS NULL
WHERE p.role = 'recruiter'
GROUP BY p.id, p.first_name, p.last_name, p.recruiter_bonus_rate;

CREATE OR REPLACE FUNCTION public.create_recruitment_credit_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_recruiter_id uuid;
  recruited_by_id uuid;
  approved_employee_id uuid;
  recruiter_rate numeric;
BEGIN
  IF OLD.status = 'approved' OR NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT
    e.recruiter_id,
    er.recruiter_id,
    er.user_id
  INTO
    event_recruiter_id,
    recruited_by_id,
    approved_employee_id
  FROM public.event_registrations AS er
  JOIN public.events AS e
    ON e.id = er.event_id
  WHERE er.id = NEW.registration_id;

  IF event_recruiter_id IS NOT NULL
     AND recruited_by_id = event_recruiter_id
     AND approved_employee_id <> event_recruiter_id
  THEN
    SELECT recruiter_bonus_rate
    INTO recruiter_rate
    FROM public.profiles
    WHERE id = event_recruiter_id;

    IF recruiter_rate IS NULL THEN
      RAISE EXCEPTION
        'לא ניתן לאשר את דוח השעות: יש להגדיר למגייס תעריף זיכוי גיוס לפני אישור השעות.'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.recruiter_bonuses (
      recruiter_id,
      source_registration_id,
      employee_id,
      event_id,
      bonus_amount
    )
    VALUES (
      event_recruiter_id,
      NEW.registration_id,
      approved_employee_id,
      NEW.event_id,
      recruiter_rate * NEW.reported_hours
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_recruitment_credit_on_approval
  AFTER UPDATE OF status
  ON public.shift_hour_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_recruitment_credit_on_approval();

COMMIT;
