-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw. Owner-rights view (bypasses RLS; exposes employee tz). Source of rollback file R0c.
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
   FROM (((shift_hour_submissions shs
     JOIN events e ON ((shs.event_id = e.id)))
     JOIN profiles emp ON ((shs.employee_id = emp.id)))
     JOIN profiles mgr ON ((shs.submitted_by = mgr.id)));
