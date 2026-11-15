import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/permissions";
import { isRegion } from "@/lib/areas";
import { PageHeader } from "@/components/ui/page-header";
import { EmployeeFilters, type EmployeeFilterValues } from "@/components/admin/employee-filters";
import { EmployeeCard } from "@/components/admin/employee-card";

// Staff employee directory (quote items 2 + 11) for Admin / Manager. Reads through search_employees in directory mode
// (p_event_id NULL), which re-checks the role in the DB and never returns tz / email / documents. A recruiter has no
// directory: they reach employees only through their own events (the same RPC with an event id).
export default async function ManagerEmployeesPage({ searchParams }: { searchParams: Promise<EmployeeFilterValues> }) {
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  if (!roleAtLeast(ctx.role, "manager")) redirect("/manager/events");

  const f = await searchParams;
  const q = (f.q ?? "").trim();
  const { data, error } = await ctx.supabase.rpc("search_employees", {
    p_query: q.length >= 2 ? q : "",
    p_region: isRegion(f.region) ? f.region : undefined,
    p_city: f.city?.trim() || undefined,
    p_role_tag: f.tag || undefined,
  });
  if (error) console.error("[ManagerEmployeesPage] search_employees", error.code, error.message);
  type Row = {
    employee_id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    age_years: number | null;
    warnings: string[] | null;
    city: string | null;
    region: string | null;
    role_tags: string[] | null;
    joined_at: string | null;
  };
  const rows = (data ?? []) as Row[];

  return (
    <div className="pb-10">
      <PageHeader title="עובדים" subtitle="סינון לפי תפקיד, אזור ועיר. לחיצה על עובד/ת פותחת את הכרטיס." />
      <EmployeeFilters action="/manager/employees" values={f} />

      {error && <p className="mb-4 text-sm text-rose-700">טעינת העובדים נכשלה.</p>}
      {q.length === 1 && <p className="mb-4 text-xs text-muted">חיפוש לפי שם דורש לפחות 2 תווים.</p>}
      <p className="mb-3 text-xs text-muted tabular-nums">{rows.length === 200 ? "200+ תוצאות, כדאי לצמצם" : `${rows.length} עובדים`}</p>

      <ul className="divide-y divide-line card">
        {rows.map((r) => {
          const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || "ללא שם";
          return (
            <li key={r.employee_id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface2">
                  <span className="font-semibold text-ink">{name}</span>
                  <span className="text-xs text-muted">{[r.city, r.region].filter(Boolean).join(", ") || "אזור לא צוין"}</span>
                  <span className="flex flex-wrap gap-1">
                    {(r.role_tags ?? []).map((t) => (
                      <span key={t} className="rounded-sm bg-sun/40 px-1.5 py-0.5 text-[11px] font-semibold text-sun-deep">
                        {t}
                      </span>
                    ))}
                  </span>
                  {(r.warnings ?? []).includes("pending_approval") && (
                    <span className="ms-auto rounded-sm bg-ink/10 px-1.5 py-0.5 text-[11px] font-semibold text-ink/80">ממתין/ה לאישור</span>
                  )}
                </summary>
                <div className="border-t border-line bg-canvas px-4 py-5">
                  <EmployeeCard
                    editable
                    employee={{
                      id: r.employee_id,
                      name,
                      phone: r.phone_number,
                      age: r.age_years,
                      city: r.city,
                      region: r.region,
                      roleTags: r.role_tags ?? [],
                      joinedAt: r.joined_at,
                    }}
                  />
                </div>
              </details>
            </li>
          );
        })}
        {rows.length === 0 && !error && <li className="px-4 py-10 text-center text-sm text-muted">לא נמצאו עובדים.</li>}
      </ul>
    </div>
  );
}

export const metadata = { title: "עובדים" };
