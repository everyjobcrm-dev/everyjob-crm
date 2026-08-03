import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentProfile, canCreateEvents } from "@/lib/auth/permissions";
import { fetchClients } from "@/app/admin/events/actions";
import { CreateEventForm } from "@/components/events/CreateEventForm";

export default async function NewEventPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (!canCreateEvents(profile)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-xl text-cream">אין לך הרשאה ליצור אירועים</h1>
        <p className="mt-2 text-sm text-cream/50">
          אם את/ה צריך/ה ליצור אירועים כחלק מהתפקיד שלך, בקש/י מהמנהל/ת להעניק לך הרשאה.
        </p>
        <Link href="/admin/events" className="mt-6 inline-block text-sm font-semibold text-indigo-400">
          חזרה לאירועים
        </Link>
      </div>
    );
  }

  const clients = await fetchClients();

  return (
    <div className="pb-10">
      <Link
        href="/admin/events"
        className="mb-4 inline-flex items-center gap-1 text-sm text-cream/50 transition-colors hover:text-cream"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        חזרה לאירועים
      </Link>

      <CreateEventForm clients={clients} />
    </div>
  );
}