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
};

export default async function AdminEmployeesPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    // Only columns that exist live. No Form 101 / employee_documents data here (AGENTS.md 8.2).
    .select("id, first_name, last_name, tz, role, recruited_by")
    .order("last_name", { ascending: true })
    .returns<ProfileRow[]>();

  const rows: AdminEmployee[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "ללא שם",
    tz: p.tz ?? "—",
    role: p.role ?? "employee",
    form101Status: null,
    totalEarnings: null,
    totalHours: null,
    recruitedBy: p.recruited_by,
  }));

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-sm text-cream/50">ממשק מנהל</p>
        <h1 className="font-display text-3xl text-cream">ניהול עובדים</h1>
      </header>

      <EmployeeDirectoryTable
        employees={rows}
        recruiters={rows.filter((r) => r.role === "recruiter").map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
