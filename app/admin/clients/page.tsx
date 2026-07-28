import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ClientsOverview } from "@/components/admin/clients-overview";
import { DEMO_CLIENTS, type ClientRecord } from "@/lib/admin/clients-data";

type ClientRow = {
  id: string;
  name: string;
  industry: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  address: string | null;
  hourly_rate: number | null;
  bonus_pct: number | null;
  status: "active" | "paused" | null;
  client_shifts: {
    id: string;
    employee_name: string | null;
    role: string | null;
    shift_date: string;
    hours: number;
    hourly_rate: number;
  }[];
};

export default async function AdminClientsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  let clients: ClientRecord[] = DEMO_CLIENTS;
  let isDemoData = true;

  // The `clients` / `client_shifts` tables may not exist yet in every environment.
  // We try the real query first and fall back to a realistic demo dataset so the
  // page always renders — remove the fallback once the tables are migrated in.
  try {
    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, name, industry, contact_name, contact_phone, address, hourly_rate, bonus_pct, status, client_shifts(id, employee_name, role, shift_date, hours, hourly_rate)"
      )
      .order("name", { ascending: true })
      .returns<ClientRow[]>();

    if (!error && data && data.length > 0) {
      clients = data.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry ?? "כללי",
        contactName: c.contact_name ?? "—",
        contactPhone: c.contact_phone ?? "—",
        address: c.address ?? "—",
        hourlyRate: c.hourly_rate ?? 0,
        bonusPct: c.bonus_pct ?? 0,
        status: c.status ?? "active",
        shifts: (c.client_shifts ?? []).map((s) => ({
          id: s.id,
          employeeName: s.employee_name ?? "עובד/ת",
          role: s.role ?? "—",
          date: s.shift_date,
          hours: s.hours,
          hourlyRate: s.hourly_rate,
        })),
      }));
      isDemoData = false;
    }
  } catch {
    // table not migrated yet — demo data already assigned above
  }

  return (
    <div className="pb-10">
      <ClientsOverview clients={clients} isDemoData={isDemoData} />
    </div>
  );
}