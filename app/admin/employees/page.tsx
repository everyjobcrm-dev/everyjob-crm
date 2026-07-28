import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeDirectoryTable, type AdminEmployee } from "@/components/admin/employee-directory-table";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  tz: string | null;
  role: "admin" | "employee" | "recruiter" | null;
  form_101_status: "missing" | "pending" | "complete" | null;
  total_earnings: number | null;
  total_hours: number | null;
};

export default async function AdminEmployeesPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, tz, role, form_101_status, total_earnings, total_hours")
    .order("last_name", { ascending: true })
    .returns<ProfileRow[]>();

  const rows: AdminEmployee[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "ללא שם",
    tz: p.tz ?? "—",
    role: p.role ?? "employee",
    form101Status: p.form_101_status ?? "missing",
    totalEarnings: p.total_earnings ?? 0,
    totalHours: p.total_hours ?? 0,
  }));

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-sm text-cream/50">ממשק מנהל</p>
        <h1 className="font-display text-3xl text-cream">ניהול עובדים</h1>
      </header>

      <EmployeeDirectoryTable employees={rows} />
    </div>
  );
}
