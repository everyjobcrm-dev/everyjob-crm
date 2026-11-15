import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeDirectoryTable, type AdminEmployee } from "@/components/admin/employee-directory-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmployeeFilters, type EmployeeFilterValues } from "@/components/admin/employee-filters";
import { isRegion } from "@/lib/areas";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  tz: string | null;
  role: "admin" | "manager" | "employee" | "recruiter" | null;
  recruited_by: string | null;
  approval_status?: string | null;
  deleted_at?: string | null;
  phone_number: string | null;
  birth_date: string | null;
  created_at: string | null;
  city: string | null;
  region: string | null;
  role_tags: string[] | null;
};

function ageFrom(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

const APPROVAL = new Set(["pending", "approved", "rejected"]);

export default async function AdminEmployeesPage({ searchParams }: { searchParams: Promise<EmployeeFilterValues> }) {
  const f = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  // Only columns that exist live. No Form 101 / employee_documents data here (AGENTS.md 8.2).
  const columns =
    "id, first_name, last_name, tz, role, recruited_by, approval_status, deleted_at, phone_number, birth_date, created_at, city, region, role_tags";
  // Quote item 11 filters. Admin reads profiles directly (RLS profiles_owner_or_admin_select).
  let query = supabase.from("profiles").select(columns);
  if (isRegion(f.region)) query = query.eq("region", f.region);
  if (f.tag) query = query.contains("role_tags", [f.tag]);
  // strip PostgREST filter syntax characters from free text before building ilike / or() filters
  const clean = (v: string | undefined) => (v ?? "").replace(/[,()*%\\]/g, " ").trim();
  if (clean(f.city)) query = query.ilike("city", `%${clean(f.city)}%`);
  const q = clean(f.q);
  if (q.length >= 2) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone_number.ilike.%${q}%`);
  const [{ data: profiles, error }, { data: recruiterRows }] = await Promise.all([
    query.order("last_name", { ascending: true }).returns<ProfileRow[]>(),
    // the "גויס ע״י" options must not shrink with the filters
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "recruiter").is("deleted_at", null),
  ]);
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
    card: {
      id: p.id,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "ללא שם",
      tz: p.tz,
      phone: p.phone_number,
      age: ageFrom(p.birth_date),
      city: p.city,
      region: p.region,
      roleTags: p.role_tags ?? [],
      joinedAt: p.created_at,
    },
  }));

  return (
    <div className="pb-10">
      <PageHeader title="עובדים" />
      <EmployeeFilters action="/admin/employees" values={f} />

      <EmployeeDirectoryTable
        employees={rows}
        recruiters={(recruiterRows ?? []).map((r) => ({ id: r.id, name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "ללא שם" }))}
      />
    </div>
  );
}
