import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeDirectoryTable, type AdminEmployee } from "@/components/admin/employee-directory-table";
import { PageHeader } from "@/components/ui/page-header";

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
  const { data: profiles, error } = await supabase.from("profiles").select(columns).order("last_name", { ascending: true }).returns<ProfileRow[]>();
  if (error) console.error("[AdminEmployeesPage]", error.code, error.message);

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
      <PageHeader title="עובדים" />

      <EmployeeDirectoryTable
        employees={rows}
        recruiters={rows.filter((r) => r.role === "recruiter" && !r.deletedAt).map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
