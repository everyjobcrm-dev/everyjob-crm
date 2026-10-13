import type { ReactNode } from "react";
import { PortalNav } from "@/components/employee/portal-nav";
import { getAuthContext } from "@/lib/auth/guards";

const STAFF_HOME = { admin: "/admin/dashboard", manager: "/manager/events", recruiter: "/manager/events" } as const;

export default async function EmployeePortalLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();
  const staffHref = ctx.ok && ctx.role !== "employee" ? STAFF_HOME[ctx.role] : null;

  return (
    <div className="min-h-screen bg-obsidian text-cream">
      <PortalNav staffHref={staffHref} />
      <main className="pb-24 lg:pb-0 lg:ps-20">
        <div className="mx-auto max-w-5xl px-5 pt-8 lg:px-10 lg:pt-12">{children}</div>
      </main>
    </div>
  );
}
