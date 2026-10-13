-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.get_employee_detail(p_employee_id uuid)
 RETURNS TABLE(employee_id uuid, first_name text, last_name text, phone_number text, birth_date date, age_years integer, average_rating numeric, total_ratings integer, joined_at timestamp with time zone, tz text, email text, email_verified boolean, phone_verified boolean, form_101_status text, event_id uuid, event_date date, client_name text, role_name text, registration_status text, registered_at timestamp with time zone, approved_hours numeric, effective_pay numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_actor_role public.profiles.role%TYPE;
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id::uuid,
    p.first_name::text,
    p.last_name::text,
    p.phone_number::text,
    p.birth_date::date,
    (CASE WHEN p.birth_date IS NULL THEN NULL
      ELSE extract(year FROM age(current_date, p.birth_date))::integer
    END)::integer,
    p.average_rating::numeric,
    p.total_ratings::integer,
    p.created_at::timestamptz,
    (CASE WHEN v_actor_role = 'admin' THEN p.tz END)::text,
    (CASE WHEN v_actor_role = 'admin' THEN p.email END)::text,
    p.email_verified::boolean,
    p.phone_verified::boolean,
    CASE
      WHEN v_actor_role = 'admin' AND auth.jwt()->>'aal' = 'aal2' THEN coalesce((
        SELECT d.status::text
        FROM public.employee_documents d
        WHERE d.employee_id = p.id AND d.doc_type = 'form_101'
        ORDER BY d.submitted_at DESC NULLS LAST
        LIMIT 1
      ), 'missing')
      WHEN v_actor_role = 'admin' THEN 'aal2_required'
    END::text,
    e.id::uuid,
    e.event_date::date,
    c.name::text,
    er.role_name::text,
    r.status::text,
    r.created_at::timestamptz,
    coalesce(hours.approved_hours, 0)::numeric,
    (CASE WHEN v_actor_role IN ('admin', 'manager')
      THEN coalesce(r.wage_rate, er.base_rate)
    END)::numeric
  FROM public.profiles p
  LEFT JOIN public.event_registrations r ON r.user_id = p.id
  LEFT JOIN public.events e ON e.id = r.event_id
  LEFT JOIN public.clients c ON c.id = e.client_id
  LEFT JOIN public.event_roles er ON er.id = r.event_role_id
  LEFT JOIN LATERAL (
    SELECT sum(s.reported_hours)::numeric AS approved_hours
    FROM public.shift_hour_submissions s
    WHERE s.registration_id = r.id AND s.status = 'approved'
  ) hours ON true
  WHERE p.id = p_employee_id AND p.role = 'employee'
  ORDER BY e.event_date DESC NULLS LAST, r.created_at DESC NULLS LAST;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_not_found';
  END IF;
END;
$function$
;
