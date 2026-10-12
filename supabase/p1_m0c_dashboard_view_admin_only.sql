-- p1_m0c: v_shift_submissions_dashboard returns rows to admins only. Same columns, order and owner rights as the live view.
CREATE OR REPLACE VIEW public.v_shift_submissions_dashboard AS
 SELECT shs.id AS submission_id,
    shs.status AS submission_status,
    shs.reported_hours,
    shs.reported_start,
    shs.reported_end,
    shs.performance_rating,
    shs.submitted_at,
    e.id AS event_id,
    e.event_date,
    e.location,
    emp.id AS employee_id,
    ((emp.first_name || ' '::text) || emp.last_name) AS employee_name,
    emp.tz AS employee_tz,
    ((mgr.first_name || ' '::text) || mgr.last_name) AS submitted_by_name
   FROM (((public.shift_hour_submissions shs
     JOIN public.events e ON ((shs.event_id = e.id)))
     JOIN public.profiles emp ON ((shs.employee_id = emp.id)))
     JOIN public.profiles mgr ON ((shs.submitted_by = mgr.id)))
  WHERE public.is_current_user_admin();

-- ROLLBACK: apply supabase/v_shift_submissions_dashboard_v1_live.sql (R0c).
