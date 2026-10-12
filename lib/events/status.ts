import { roleAtLeast, type AppRole } from "@/lib/auth/permissions";

/**
 * Event status model (pure, importable from client components).
 *
 * "closed" means CLOSED FOR REGISTRATION ("סגור להרשמה") - it is NOT the financial/end-of-event closure.
 * Staffing status ("full") is DERIVED from the event_role_fill_counts view and never stored here.
 *
 *   pending_rates  rates missing; hidden from employees; cannot take registrations
 *   open           employees (and staff-as-workers) may register; a full role routes to the waitlist
 *   closed         no NEW registrations (incl. waitlist joins); staff may still approve/assign/remove
 *   cancelled      marked only; registrations are not touched; excluded from every derived calculation
 *   completed      FROZEN - no transition in or out through the app (service_role / direct DB only)
 *   paused         FROZEN - same
 *
 * The allowed transitions below MIRROR the database trigger enforce_event_status_transition (the DB is authoritative;
 * this table only drives the UI and server-action pre-checks).
 */

export const EVENT_STATUSES = ["pending_rates", "open", "closed", "cancelled", "completed", "paused"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const FROZEN_STATUSES: readonly EventStatus[] = ["completed", "paused"];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  pending_rates: "ממתין לתעריפים",
  open: "פתוח להרשמה",
  closed: "סגור להרשמה",
  cancelled: "בוטל",
  completed: "נסגר פיננסית",
  paused: "מושהה",
};

export const EVENT_STATUS_STYLE: Record<EventStatus, string> = {
  pending_rates: "bg-[#D4FF00]/15 text-[#D4FF00]",
  open: "bg-indigo-500/15 text-indigo-400",
  closed: "bg-cream/10 text-cream/60",
  cancelled: "bg-rose-500/15 text-rose-400",
  completed: "bg-cream/10 text-cream/60",
  paused: "bg-cream/10 text-cream/60",
};

export function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === "string" && (EVENT_STATUSES as readonly string[]).includes(value);
}

export function isFrozenStatus(status: EventStatus): boolean {
  return FROZEN_STATUSES.includes(status);
}

const RECRUITER_TRANSITIONS: Partial<Record<EventStatus, EventStatus[]>> = {
  open: ["closed", "cancelled"],
  closed: ["open", "cancelled"],
  pending_rates: ["open", "cancelled"],
};

const MANAGER_TRANSITIONS: Partial<Record<EventStatus, EventStatus[]>> = {
  open: ["closed", "cancelled"],
  closed: ["open", "cancelled"],
  pending_rates: ["open", "cancelled"],
  cancelled: ["open", "closed", "pending_rates"],
};

/**
 * Statuses the caller may move an event to. `isOwner` = the caller owns the event (events.recruiter_id = caller);
 * a recruiter may only act on own events and can never restore a cancelled one. Admin == Manager here (hierarchy).
 */
export function allowedEventTransitions(
  role: AppRole | null | undefined,
  from: EventStatus,
  isOwner: boolean,
): EventStatus[] {
  if (isFrozenStatus(from)) return [];
  if (roleAtLeast(role, "manager")) return MANAGER_TRANSITIONS[from] ?? [];
  if (role === "recruiter" && isOwner) return RECRUITER_TRANSITIONS[from] ?? [];
  return [];
}

/**
 * Default target when restoring a cancelled event: the status it was cancelled from (events.cancelled_from_status).
 * Null, completed or paused fall back to 'closed' (safe: no new registrations until staff reopen it).
 * Moving to open/closed is still subject to the missing-rates check in the database.
 */
export function defaultRestoreStatus(cancelledFrom: string | null | undefined): EventStatus {
  if (!isEventStatus(cancelledFrom)) return "closed";
  if (cancelledFrom === "completed" || cancelledFrom === "paused" || cancelledFrom === "cancelled") return "closed";
  return cancelledFrom;
}

/** Events hidden from employee discovery and from "My shifts". */
export function isHiddenFromEmployees(status: EventStatus): boolean {
  return status !== "open";
}
