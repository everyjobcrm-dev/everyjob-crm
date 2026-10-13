/**
 * Role hierarchy - the SINGLE source of truth on the app side.
 *
 *   Admin  >=  Manager (field manager)  >=  Recruiter  >  Employee
 *
 * Anything a Recruiter may do in event management, a Manager may do; anything a Manager may do, an Admin may do.
 * Admin and Manager act on ALL events and registrations; a Recruiter acts only on events they own
 * (events.recruiter_id = their id). The database mirrors this in app_can_manage_event(), the events status trigger
 * (enforce_event_status_transition) and the registration write guard (guard_event_registration_write).
 *
 * This file is pure (no server imports) so client components may import it. It is a UX/pre-check layer; every server
 * action still re-verifies the caller's role from the database (AGENTS.md 5.2) via lib/auth/guards.ts.
 */

export type AppRole = "admin" | "manager" | "recruiter" | "employee";
export type StaffRole = Exclude<AppRole, "employee">;

const RANK: Record<AppRole, number> = { admin: 3, manager: 2, recruiter: 1, employee: 0 };

export function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "manager" || value === "recruiter" || value === "employee";
}

/** True when `role` is at least `min` in the hierarchy. Null/unknown roles never pass. */
export function roleAtLeast(role: AppRole | null | undefined, min: StaffRole): boolean {
  return role != null && RANK[role] >= RANK[min];
}

export function isStaffRole(role: AppRole | null | undefined): role is StaffRole {
  return roleAtLeast(role, "recruiter");
}

export type PermissionProfile = {
  id: string;
  role: AppRole;
  can_create_events: boolean;
};

/** Create events: Admin and Manager always; a Recruiter only with the explicit profiles.can_create_events flag. */
export function canCreateEvents(profile: PermissionProfile | null | undefined): boolean {
  if (!profile) return false;
  if (roleAtLeast(profile.role, "manager")) return true;
  return profile.role === "recruiter" && profile.can_create_events === true;
}

/**
 * Manage an event (open/close/cancel, approve/reject/remove signups, handle cancellation requests):
 * Admin and Manager on every event; a Recruiter only on an event they own.
 */
export function canManageEvent(
  profile: PermissionProfile | null | undefined,
  event: { recruiter_id: string | null },
): boolean {
  if (!profile) return false;
  if (roleAtLeast(profile.role, "manager")) return true;
  return profile.role === "recruiter" && event.recruiter_id != null && event.recruiter_id === profile.id;
}

/** Restore a cancelled event, enter attendance/hours, rate employees: Manager and above. */
export function canRestoreEvent(role: AppRole | null | undefined): boolean {
  return roleAtLeast(role, "manager");
}

/** Final hour-report approval, event deletion, client pricing, recruiter credit rate, user roles: Admin only. */
export function isAdminOnlyAction(role: AppRole | null | undefined): boolean {
  return role === "admin";
}
