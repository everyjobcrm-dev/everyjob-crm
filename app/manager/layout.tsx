import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/permissions";

// Server-side guard (AGENTS.md 5.2): the manager portal is for staff only - Admin >= Manager >= Recruiter.
// Employees are sent to their own portal. Row-level scope (recruiter: own events only) is enforced by the database.
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx.ok) {
    redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  }
  if (!roleAtLeast(ctx.role, "recruiter")) {
    redirect("/employee/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Manager portal header */}
      <header className="border-b border-brass/10 bg-surface px-6 py-4">
        <h1 className="font-display text-xl text-cream">ניהול אירועים</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
