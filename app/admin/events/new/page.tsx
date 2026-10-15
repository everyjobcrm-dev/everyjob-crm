//app/admin/events/new/page.tsx
import { fetchClients, fetchRecruiterOptions } from "@/app/admin/actions";
import { CreateEventForm } from "@/components/events/CreateEventForm";

export default async function NewEventPage() {
  const [clients, recruiters] = await Promise.all([fetchClients(), fetchRecruiterOptions()]);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <CreateEventForm clients={clients} recruiters={recruiters} />
    </div>
  );
}