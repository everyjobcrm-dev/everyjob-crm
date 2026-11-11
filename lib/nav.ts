/**
 * Navigation model for the shared app shell. Pure (no server imports) and derived only from lib/auth/permissions.ts,
 * so the role logic lives in one place. This decides what the shell SHOWS; every page and server action still
 * re-verifies the role server-side (AGENTS.md 5.2).
 */
import { isStaffRole, type AppRole, type PermissionProfile } from "@/lib/auth/permissions";

export type NavIcon =
  | "home"
  | "events"
  | "shifts"
  | "profile"
  | "dashboard"
  | "staffEvents"
  | "hours"
  | "employees"
  | "recruiters"
  | "clients";

export type NavItem = { href: string; label: string; icon: NavIcon };

export type NavModel = {
  role: AppRole;
  roleLabel: string;
  /** The employee-side items every role gets (staff may also work shifts). */
  work: NavItem[];
  /** Extra management items for staff; empty for employees. */
  manage: NavItem[];
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "אדמין",
  manager: "מנהל/ת שטח",
  recruiter: "מגייס/ת",
  employee: "עובד/ת",
};

/** Where each role lands after login (mirrors middleware.ts). */
export const HOME_BY_ROLE: Record<AppRole, string> = {
  admin: "/admin/dashboard",
  manager: "/manager/events",
  recruiter: "/manager/events",
  employee: "/employee/dashboard",
};

const WORK_ITEMS: NavItem[] = [
  { href: "/employee/dashboard", label: "בית", icon: "home" },
  { href: "/employee/events", label: "אירועים", icon: "events" },
  { href: "/employee/shifts", label: "המשמרות שלי", icon: "shifts" },
  { href: "/employee/profile", label: "פרופיל", icon: "profile" },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "דף הבית", icon: "dashboard" },
  { href: "/admin/events", label: "אירועים ומשמרות", icon: "staffEvents" },
  { href: "/admin/hours", label: "אישור שעות", icon: "hours" },
  { href: "/admin/employees", label: "עובדים", icon: "employees" },
  { href: "/admin/recruiters", label: "מגייסים", icon: "recruiters" },
  { href: "/admin/clients", label: "לקוחות", icon: "clients" },
];

export function buildNav(profile: PermissionProfile | null): NavModel {
  const role: AppRole = profile?.role ?? "employee";
  let manage: NavItem[] = [];

  if (role === "admin") {
    manage = ADMIN_ITEMS;
  } else if (isStaffRole(role)) {
    // "אירוע חדש" is a button on the events list itself (shown only when canCreateEvents), not a nav item.
    manage = [
      { href: "/manager/events", label: role === "recruiter" ? "האירועים שלי" : "כל האירועים", icon: "staffEvents" },
    ];
  }

  return { role, roleLabel: ROLE_LABEL[role], work: WORK_ITEMS, manage };
}

/** Active-item test shared by every nav renderer. */
export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
