import { CalendarCheck, Clock } from "lucide-react";
import { StatStub } from "@/components/employee/StatStub";
import { MyShiftsList } from "@/components/employee/MyShiftsList";
import { fetchMyMonthlyHours, fetchMyShifts } from "@/app/employee/events/actions";
import { MonthlyHoursCard } from "@/components/employee/MonthlyHoursCard";

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
      <header className="mb-6">
        <h1 className="font-display text-3xl text-cream">המשמרות שלי</h1>
        <p className="mt-1 text-sm text-cream/50">משמרות קרובות, בקשות ממתינות והיסטוריה.</p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <StatStub label="משמרות קרובות שאושרו" value={upcomingApproved} icon={CalendarCheck} />
        <StatStub label="בקשות ביטול פתוחות" value={openRequests} icon={Clock} />
      </div>

      <MonthlyHoursCard months={monthly} currentMonth={today.slice(0, 7) + "-01"} />

      <MyShiftsList shifts={shifts} today={today} />
    </div>
  );
}
