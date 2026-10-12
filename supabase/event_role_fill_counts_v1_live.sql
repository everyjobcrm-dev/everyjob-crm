-- ROLLBACK ARTIFACT R9: verbatim live definition captured 2026-10-12 from project yjgqunrboxihxtgkxibw (md5-verified against pg_get_*def). Rolls back p1_m9a.
-- Apply ONLY to roll back the corresponding p1_* migration.
 SELECT er.id AS event_role_id,
    er.event_id,
    er.headcount,
    count(reg.id) FILTER (WHERE (reg.status = ANY (ARRAY['pending'::registration_status, 'approved'::registration_status, 'registered'::registration_status, 'confirmed'::registration_status, 'completed'::registration_status]))) AS filled_count
   FROM (event_roles er
     LEFT JOIN event_registrations reg ON ((reg.event_role_id = er.id)))
  GROUP BY er.id, er.event_id, er.headcount;
