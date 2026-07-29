import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ClientsOverview } from "@/components/admin/clients-overview";
import { mapClientRow, type ClientRecord, type ClientRow } from "@/lib/admin/clients-data";

export default async function AdminClientsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  let clients: ClientRecord[] = [];
  let loadError = false;

  const { data, error } = await supabase
    .from("clients")
    .select("*, events(count)")
    .order("name", { ascending: true })
    .returns<ClientRow[]>();

  if (error) {
    loadError = true;
  } else if (data) {
    clients = data.map(mapClientRow);
  }

  return (
    <div className="pb-10">
      <ClientsOverview clients={clients} loadError={loadError} />
    </div>
  );
}