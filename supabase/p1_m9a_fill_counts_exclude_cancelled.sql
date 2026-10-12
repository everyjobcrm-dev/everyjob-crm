-- p1_m9a: event_role_fill_counts - capacity = pending + approved only (amendment C) and cancelled events are excluded.
-- Same columns, order and types as the live view (owner rights kept; do NOT make it security_invoker).
-- Diff vs live: filled_count FILTER list loses 'registered','confirmed','completed'; adds JOIN events ... status <> 'cancelled'.
CREATE OR REPLACE VIEW public.event_role_fill_counts AS
 SELECT er.id AS event_role_id,
    er.event_id,
    er.headcount,
    count(reg.id) FILTER (WHERE (reg.status = ANY (ARRAY['pending'::registration_status, 'approved'::registration_status]))) AS filled_count
   FROM ((public.event_roles er
     JOIN public.events ev ON (((ev.id = er.event_id) AND (ev.status <> 'cancelled'::text))))
     LEFT JOIN public.event_registrations reg ON ((reg.event_role_id = er.id)))
  GROUP BY er.id, er.event_id, er.headcount;

-- ROLLBACK: apply supabase/event_role_fill_counts_v1_live.sql (R9).
