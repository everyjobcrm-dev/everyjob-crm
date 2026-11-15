-- Rollback for C1: restores the p6_h5 definition (hours x wage_rate, no overtime). No DROP.
CREATE OR REPLACE VIEW public.v_my_monthly_hours WITH (security_invoker = true) AS
SELECT s.employee_id,
       date_trunc('month', e.event_date::timestamp)::date AS month,
       sum(s.reported_hours) AS approved_hours,
       sum(s.reported_hours * r.wage_rate) AS estimated_pay,
       count(*) FILTER (WHERE r.wage_rate IS NULL) AS shifts_without_rate
  FROM public.shift_hour_submissions s
  JOIN public.event_registrations r ON r.id = s.registration_id
  JOIN public.events e ON e.id = s.event_id
 WHERE s.status = 'approved' AND s.voided_at IS NULL AND e.status <> 'cancelled'
 GROUP BY s.employee_id, date_trunc('month', e.event_date::timestamp);
