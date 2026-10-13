-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.list_employees(p_query text, p_min_rating numeric, p_sort text, p_dir text, p_limit integer, p_offset integer)
 RETURNS TABLE(employee_id uuid, first_name text, last_name text, phone_number text, tz text, email text, age_years integer, average_rating numeric, events_attended bigint, approved_hours numeric, joined_at timestamp with time zone, form_101_status text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_actor_role public.profiles.role%TYPE;
  v_sort text := coalesce(p_sort, 'name');
  v_dir text := lower(coalesce(p_dir, 'asc'));
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_sort NOT IN ('name', 'phone', 'age', 'rating', 'events_attended', 'approved_hours', 'joined_at')
    OR v_dir NOT IN ('asc', 'desc')
  THEN
    RAISE EXCEPTION 'invalid_sort';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.phone_number,
      CASE WHEN v_actor_role = 'admin' THEN p.tz END AS tz,
      CASE WHEN v_actor_role = 'admin' THEN p.email END AS email,
      CASE WHEN p.birth_date IS NULL THEN NULL
        ELSE extract(year FROM age(current_date, p.birth_date))::integer
      END AS age_years,
      p.average_rating,
      (SELECT count(DISTINCT r.event_id)::bigint
       FROM public.event_registrations r
       WHERE r.user_id = p.id
         AND (
           r.status = 'completed'
           OR EXISTS (
             SELECT 1
             FROM public.shift_hour_submissions s
             WHERE s.registration_id = r.id AND s.status = 'approved'
           )
         )) AS events_attended,
      coalesce((
        SELECT sum(s.reported_hours)
        FROM public.event_registrations r
        JOIN public.shift_hour_submissions s ON s.registration_id = r.id
        WHERE r.user_id = p.id AND s.status = 'approved'
      ), 0)::numeric AS approved_hours,
      p.created_at AS joined_at,
      CASE
        WHEN v_actor_role = 'admin' AND auth.jwt()->>'aal' = 'aal2' THEN coalesce((
          SELECT d.status::text
          FROM public.employee_documents d
          WHERE d.employee_id = p.id AND d.doc_type = 'form_101'
          ORDER BY d.submitted_at DESC NULLS LAST
          LIMIT 1
        ), 'missing')
        WHEN v_actor_role = 'admin' THEN 'aal2_required'
      END AS form_101_status
    FROM public.profiles p
    WHERE p.role = 'employee'
      AND (
        nullif(btrim(p_query), '') IS NULL
        OR concat_ws(' ', p.first_name, p.last_name) ILIKE '%' || btrim(p_query) || '%'
        OR coalesce(p.phone_number, '') ILIKE '%' || btrim(p_query) || '%'
      )
      AND (p_min_rating IS NULL OR p.average_rating >= p_min_rating)
  ),
  counted AS (
    SELECT filtered.*, (count(*) OVER ())::bigint AS total_count
    FROM filtered
  ),
  paged AS (
    SELECT *
    FROM counted
    ORDER BY
      CASE WHEN v_sort = 'name' AND v_dir = 'asc' THEN last_name END ASC NULLS LAST,
      CASE WHEN v_sort = 'name' AND v_dir = 'desc' THEN last_name END DESC NULLS LAST,
      CASE WHEN v_sort = 'name' AND v_dir = 'asc' THEN first_name END ASC NULLS LAST,
      CASE WHEN v_sort = 'name' AND v_dir = 'desc' THEN first_name END DESC NULLS LAST,
      CASE WHEN v_sort = 'phone' AND v_dir = 'asc' THEN phone_number END ASC NULLS LAST,
      CASE WHEN v_sort = 'phone' AND v_dir = 'desc' THEN phone_number END DESC NULLS LAST,
      CASE WHEN v_sort = 'age' AND v_dir = 'asc' THEN age_years END ASC NULLS LAST,
      CASE WHEN v_sort = 'age' AND v_dir = 'desc' THEN age_years END DESC NULLS LAST,
      CASE WHEN v_sort = 'rating' AND v_dir = 'asc' THEN average_rating END ASC NULLS LAST,
      CASE WHEN v_sort = 'rating' AND v_dir = 'desc' THEN average_rating END DESC NULLS LAST,
      CASE WHEN v_sort = 'events_attended' AND v_dir = 'asc' THEN events_attended END ASC NULLS LAST,
      CASE WHEN v_sort = 'events_attended' AND v_dir = 'desc' THEN events_attended END DESC NULLS LAST,
      CASE WHEN v_sort = 'approved_hours' AND v_dir = 'asc' THEN approved_hours END ASC NULLS LAST,
      CASE WHEN v_sort = 'approved_hours' AND v_dir = 'desc' THEN approved_hours END DESC NULLS LAST,
      CASE WHEN v_sort = 'joined_at' AND v_dir = 'asc' THEN joined_at END ASC NULLS LAST,
      CASE WHEN v_sort = 'joined_at' AND v_dir = 'desc' THEN joined_at END DESC NULLS LAST,
      id
    LIMIT greatest(1, least(coalesce(p_limit, 20), 100))
    OFFSET greatest(coalesce(p_offset, 0), 0)
  ),
  totals AS (
    SELECT count(*)::bigint AS total_count FROM filtered
  )
  SELECT
    paged.id::uuid,
    paged.first_name::text,
    paged.last_name::text,
    paged.phone_number::text,
    paged.tz::text,
    paged.email::text,
    paged.age_years::integer,
    paged.average_rating::numeric,
    paged.events_attended::bigint,
    paged.approved_hours::numeric,
    paged.joined_at::timestamptz,
    paged.form_101_status::text,
    totals.total_count::bigint
  FROM totals
  LEFT JOIN paged ON true;
END;
$function$
;
