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

  // Pricing columns are Admin-only (B1 column grant); the RPC re-checks the role.
  const { data, error } = await supabase.rpc("get_clients_admin");

  if (error) {
    loadError = true;
  } else if (data) {
    clients = (data as ClientRow[]).map(mapClientRow);
  }

  return (
    <div className="pb-10">
      <ClientsOverview clients={clients} loadError={loadError} />
    </div>
  );
}