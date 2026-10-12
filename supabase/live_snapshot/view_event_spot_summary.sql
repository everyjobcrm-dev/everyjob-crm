-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw. Owner-rights view. Unused by the app; counts every non-cancelled registration (waitlisted/rejected/removed included) - known-wrong, deferred.
CREATE OR REPLACE VIEW public.event_spot_summary AS
 SELECT ero.event_id,
    sum(ero.headcount) AS spots_total,
    count(er.id) FILTER (WHERE (er.status <> 'cancelled'::registration_status)) AS spots_filled
   FROM (event_roles ero
     LEFT JOIN event_registrations er ON ((er.event_role_id = ero.id)))
  GROUP BY ero.event_id;
