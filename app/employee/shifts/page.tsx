import { CalendarCheck, Clock } from "lucide-react";
import { StatStub } from "@/components/employee/StatStub";
import { MyShiftsList } from "@/components/employee/MyShiftsList";
import { fetchMyMonthlyHours, fetchMyShifts } from "@/app/employee/events/actions";
import { MonthlyHoursCard } from "@/components/employee/MonthlyHoursCard";
import { PageHeader } from "@/components/ui/page-header";

// "המשמרות שלי": the signed-in worker's own registrations (employees and staff-as-workers alike).
// Counts are derived from the rows on every render - nothing is stored.
export default async function MyShiftsPage() {
  const [{ shifts, today }, monthly] = await Promise.all([fetchMyShifts(), fetchMyMonthlyHours()]);
  const upcomingApproved = shifts.filter((s) => s.status === "approved" && s.eventDate >= today).length;
  const openRequests = shifts.filter(
    (s) => s.cancellationRequestedAt && ["approved", "pending", "waitlisted"].includes(s.status) && s.eventDate >= today,
  ).length;

  return (
    <div className="pb-10">
      <PageHeader title="המשמרות שלי" subtitle="משמרות קרובות, בקשות ממתינות והיסטוריה." />

      <div className="mb-8 grid grid-cols-2 gap-4">
        <StatStub label="משמרות קרובות שאושרו" value={upcomingApproved} icon={CalendarCheck} />
        <StatStub label="בקשות ביטול פתוחות" value={openRequests} icon={Clock} />
      </div>

      <MonthlyHoursCard months={monthly} currentMonth={today.slice(0, 7) + "-01"} />

      <MyShiftsList shifts={shifts} today={today} />
    </div>
  );
}
