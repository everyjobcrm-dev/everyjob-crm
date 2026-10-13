-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw. Owner-rights view (no security_invoker). Source of rollback file R9.
CREATE OR REPLACE VIEW public.event_role_fill_counts AS
 SELECT er.id AS event_role_id,
    er.event_id,
    er.headcount,
    count(reg.id) FILTER (WHERE (reg.status = ANY (ARRAY['pending'::registration_status, 'approved'::registration_status, 'registered'::registration_status, 'confirmed'::registration_status, 'completed'::registration_status]))) AS filled_count
   FROM (event_roles er
     LEFT JOIN event_registrations reg ON ((reg.event_role_id = er.id)))
  GROUP BY er.id, er.event_id, er.headcount;
