import { fetchClients } from "@/app/admin/events/actions";
import { CreateEventForm } from "@/components/events/CreateEventForm";

export default async function NewEventPage() {
  const clients = await fetchClients();

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <CreateEventForm clients={clients} />
    </div>
  );
}