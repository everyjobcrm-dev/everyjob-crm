import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeDirectoryTable, type AdminEmployee } from "@/components/admin/employee-directory-table";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  tz: string | null;
  role: "admin" | "manager" | "employee" | "recruiter" | null;
  recruited_by: string | null;
  approval_status?: string | null;
  deleted_at?: string | null;
};

const APPROVAL = new Set(["pending", "approved", "rejected"]);

export default async function AdminEmployeesPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  // Only columns that exist live. No Form 101 / employee_documents data here (AGENTS.md 8.2).
  const columns = "id, first_name, last_name, tz, role, recruited_by, approval_status, deleted_at";
  let { data: profiles, error } = await supabase.from("profiles").select(columns).order("last_name", { ascending: true }).returns<ProfileRow[]>();
  // shortcut: until p10c/p10d are applied the two columns do not exist (42703); fall back so the page keeps working.
  // Remove once supabase/pending/20261110100200 + 20261110100300 are live.
  if (error?.code === "42703") {
    ({ data: profiles, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, tz, role, recruited_by")
      .order("last_name", { ascending: true })
      .returns<ProfileRow[]>());
  }

  const rows: AdminEmployee[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "ללא שם",
    tz: p.tz ?? "—",
    role: p.role ?? "employee",
    form101Status: null,
    totalEarnings: null,
    totalHours: null,
    recruitedBy: p.recruited_by,
    approvalStatus: APPROVAL.has(p.approval_status ?? "") ? (p.approval_status as AdminEmployee["approvalStatus"]) : null,
    deletedAt: p.deleted_at ?? null,
  }));

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-sm text-cream/50">ממשק מנהל</p>
        <h1 className="font-display text-3xl text-cream">ניהול עובדים</h1>
      </header>

      <EmployeeDirectoryTable
        employees={rows}
        recruiters={rows.filter((r) => r.role === "recruiter" && !r.deletedAt).map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
