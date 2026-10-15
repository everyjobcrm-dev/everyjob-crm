/**
 * App-shell navigation, composed by role. Pure data (no React, no server imports) so both the server layouts and the
 * client nav can use it.
 *
 * This decides what the shell SHOWS, nothing else. Every route still enforces access on its own: middleware.ts, the
 * layout guards and requireRole() in each server action (AGENTS.md 5.2). Role logic is reused from
 * lib/auth/permissions.ts, never re-derived here.
 */
import { canCreateEvents, isAdminOnlyAction, isStaffRole, roleAtLeast, type AppRole } from "@/lib/auth/permissions";

export type NavIcon =
  | "home"
  | "events"
  | "shifts"
  | "profile"
  | "staffEvents"
  | "newEvent"
  | "dashboard"
  | "hours"
  | "employees"
  | "recruiters"
  | "clients";

export type NavItem = { href: string; label: string; icon: NavIcon };
export type NavSection = { id: "main" | "manage"; title: string | null; items: NavItem[] };

export type NavInput = { role: AppRole; can_create_events: boolean };

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: "/employee/dashboard", label: "בית", icon: "home" },
  { href: "/employee/events", label: "אירועים", icon: "events" },
  { href: "/employee/shifts", label: "המשמרות שלי", icon: "shifts" },
  { href: "/employee/profile", label: "פרופיל", icon: "profile" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "לוח בקרה", icon: "dashboard" },
  { href: "/admin/events", label: "אירועים ומשמרות", icon: "staffEvents" },
  { href: "/admin/hours", label: "אישור שעות", icon: "hours" },
  { href: "/admin/employees", label: "עובדים", icon: "employees" },
  { href: "/admin/recruiters", label: "מגייסים", icon: "recruiters" },
  { href: "/admin/clients", label: "לקוחות", icon: "clients" },
];

const NEW_EVENT: NavItem = { href: "/new", label: "אירוע חדש", icon: "newEvent" };

/** Shell navigation for a role. Employees get one section; staff get a second "ניהול" section. */
export function buildNav({ role, can_create_events }: NavInput): NavSection[] {
  const sections: NavSection[] = [{ id: "main", title: null, items: EMPLOYEE_ITEMS }];
  if (!isStaffRole(role)) return sections;

  // canCreateEvents ignores the flag for manager/admin, so callers without it may pass false for those roles.
  const createItems = canCreateEvents({ id: "", role, can_create_events }) ? [NEW_EVENT] : [];

  let manage: NavItem[];
  if (isAdminOnlyAction(role)) {
    manage = [...ADMIN_ITEMS, ...createItems];
  } else {
    const eventsLabel = roleAtLeast(role, "manager") ? "כל האירועים" : "האירועים שלי";
    manage = [{ href: "/manager/events", label: eventsLabel, icon: "staffEvents" }, ...createItems];
  }

  return [...sections, { id: "manage", title: "ניהול", items: manage }];
}

/** Where a role lands after login (mirrors middleware.ts; display/link use only). */
export function homeFor(role: AppRole): string {
  if (isAdminOnlyAction(role)) return "/admin/dashboard";
  if (isStaffRole(role)) return "/manager/events";
  return "/employee/dashboard";
}

/** The single active href: the longest item href that prefixes the pathname on a segment boundary. */
export function activeHref(sections: NavSection[], pathname: string | null): string | null {
  if (!pathname) return null;
  let best: string | null = null;
  for (const { items } of sections) {
    for (const { href } of items) {
      const hit = pathname === href || pathname.startsWith(href + "/");
      if (hit && (best == null || href.length > best.length)) best = href;
    }
  }
  return best;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "אדמין",
  manager: "מנהל/ת שטח",
  recruiter: "מגייס/ת",
  employee: "עובד/ת",
};
