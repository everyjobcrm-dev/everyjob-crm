-- ROLLBACK ARTIFACT R0c: verbatim live definition captured 2026-10-12 from project yjgqunrboxihxtgkxibw (md5-verified against pg_get_*def). Rolls back p1_m0c (grants are preserved by CREATE OR REPLACE VIEW).
-- Apply ONLY to roll back the corresponding p1_* migration.
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
