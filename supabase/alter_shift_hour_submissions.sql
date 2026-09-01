ALTER TABLE public.shift_hour_submissions
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN submitted_by SET NOT NULL,
  ADD COLUMN employee_id uuid,
  ADD COLUMN event_id uuid;

CREATE OR REPLACE FUNCTION public.set_shift_submission_refs()
RETURNS tr  igger LANGUAGE plpgsql AS $$
BEGIN
  SELECT er.user_id, er.event_id
    INTO NEW.employee_id, NEW.event_id
    FROM public.event_registrations er
    WHERE er.id = NEW.registration_id;

  IF NEW.employee_id IS NULL THEN
    RAISE EXCEPTION 'Invalid registration_id: %', NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_shift_submission_refs
  BEFORE INSERT ON public.shift_hour_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_shift_submission_refs();

ALTER TABLE public.shift_hour_submissions
  ADD CONSTRAINT shift_hour_submissions_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT shift_hour_submissions_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id);

CREATE INDEX idx_shs_employee ON public.shift_hour_submissions(employee_id);
CREATE INDEX idx_shs_event    ON public.shift_hour_submissions(event_id);
CREATE INDEX idx_shs_status   ON public.shift_hour_submissions(status);  