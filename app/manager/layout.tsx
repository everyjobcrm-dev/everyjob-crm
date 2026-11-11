import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/permissions";
import { ShellLayout } from "@/components/shell/ShellLayout";

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

  return <ShellLayout width="wide">{children}</ShellLayout>;
}
