import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getAuthContext } from "@/lib/auth/guards";

// Access to /employee/* is enforced by middleware.ts (unchanged). The shell only composes the nav for the caller's role:
// staff (admin / manager / recruiter) can also work shifts, so they see the employee items plus their "ניהול" section.
export default async function EmployeePortalLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();

  return (
    <AppShell
      role={ctx.ok ? ctx.role : "employee"}
      canCreateEventsFlag={ctx.ok ? ctx.profile.can_create_events : false}
    >
      {children}
    </AppShell>
  );
}
