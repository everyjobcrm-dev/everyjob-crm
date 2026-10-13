import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guards";
import { canCreateEvents, roleAtLeast } from "@/lib/auth/permissions";

const ROLE_LABEL = { admin: "אדמין", manager: "מנהל/ת שטח", recruiter: "מגייס/ת", employee: "עובד/ת" } as const;

// Server-side guard (AGENTS.md 5.2): the staff portal is for Admin >= Manager >= Recruiter.
// Employees are sent to their own portal. Row-level scope (recruiter: own events only) is enforced by the database.
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx.ok) {
    redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  }
  if (!roleAtLeast(ctx.role, "recruiter")) {
    redirect("/employee/dashboard");
  }

  const links = [
    { href: "/manager/events", label: ctx.role === "recruiter" ? "האירועים שלי" : "אירועים" },
    ...(canCreateEvents(ctx.profile) ? [{ href: "/new", label: "אירוע חדש" }] : []),
    // staff may also work shifts themselves (staff-as-worker)
    { href: "/employee/shifts", label: "המשמרות שלי" },
    ...(ctx.role === "admin" ? [{ href: "/admin/dashboard", label: "ניהול מערכת" }] : []),
  ];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-brass/10 bg-surface px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-xl text-cream">ניהול אירועים</h1>
            <span className="text-xs text-cream/45">{ROLE_LABEL[ctx.role]}</span>
          </div>
          <nav aria-label="ניווט צוות" className="flex flex-wrap gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm text-cream/70 transition-colors hover:bg-surface2 hover:text-cream"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
