-- Step 2 — separate run
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY er_employee_select_own ON public.event_registrations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.register_for_event_role(p_event_role_id uuid)
RETURNS public.event_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role    public.event_roles%ROWTYPE;
  v_event   public.events%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_filled  int;
  v_status  registration_status;
  v_new_reg public.event_registrations%ROWTYPE;
  v_uid     uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- lock the role row so concurrent registrations serialize on capacity
  SELECT * INTO v_role FROM public.event_roles WHERE id = p_event_role_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'role_not_found';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_role.event_id;
  IF v_event.status <> 'open' THEN
    RAISE EXCEPTION 'not_open';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;

  IF v_event.min_age IS NOT NULL
     AND (v_profile.birth_date IS NULL
          OR date_part('year', age(v_profile.birth_date)) < v_event.min_age) THEN
    RAISE EXCEPTION 'not_eligible: age';
  END IF;

  IF v_event.min_rating IS NOT NULL
     AND v_profile.average_rating < v_event.min_rating THEN
    RAISE EXCEPTION 'not_eligible: rating';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employee_role_skills ers
    WHERE ers.employee_id = v_uid AND ers.role_name::text = v_role.role_name
  ) THEN
    RAISE EXCEPTION 'not_eligible: role_skill';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_role_id = p_event_role_id
      AND user_id = v_uid
      AND status NOT IN ('rejected', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'already_registered';
  END IF;

  SELECT count(*) INTO v_filled
  FROM public.event_registrations
  WHERE event_role_id = p_event_role_id
    AND status IN ('pending', 'approved');

  v_status := CASE WHEN v_filled >= v_role.headcount THEN 'waitlisted' ELSE 'pending' END;

  INSERT INTO public.event_registrations (event_id, user_id, event_role_id, status)
  VALUES (v_role.event_id, v_uid, p_event_role_id, v_status)
  RETURNING * INTO v_new_reg;

  RETURN v_new_reg;
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_event_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_for_event_role(uuid) TO authenticated;