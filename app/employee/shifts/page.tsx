import { Clock, Users2 } from "lucide-react";
import { StatStub } from "@/components/employee/StatStub";
import { ShiftLedgerRow } from "@/components/employee/ShiftLedgerRow";

type ShiftRecord = {
  id: string;
  role: string;
  location: string;
  date: string;
  hours: number;
  wage: string;
};

// TODO: replace with a Supabase query filtered to the current calendar month
const SHIFTS_THIS_MONTH: ShiftRecord[] = [
  { id: "1", role: "מלצרית", location: "מסעדת טאבון, תל אביב", date: "2.7", hours: 6, wage: "₪330" },
  { id: "2", role: "דיילית אירוח", location: "כנס הייטק, הרצליה", date: "9.7", hours: 8, wage: "₪440" },
  { id: "3", role: "ברמנית", location: "אירוע פרטי, רמת גן", date: "15.7", hours: 5, wage: "₪300" },
  { id: "4", role: "מלצרית", location: "חתונה, הרצליה", date: "22.7", hours: 7, wage: "₪406" },
];

export default function ShiftsHistoryPage() {
  const totalHours = SHIFTS_THIS_MONTH.reduce((sum, s) => sum + s.hours, 0);
  const recruitedCount = 2; // TODO: derive from referrals table

  return (
    <div className="pb-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-cream">משמרות</h1>
        <p className="mt-1 text-sm text-cream/50">היסטוריית המשמרות שלך בחודש הנוכחי</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatStub label="שעות החודש" value={totalHours} icon={Clock} />
        <StatStub label="גיוסים החודש" value={recruitedCount} icon={Users2} />
      </div>

      <div className="space-y-3">
        {SHIFTS_THIS_MONTH.map((shift) => (
          <ShiftLedgerRow key={shift.id} {...shift} />
        ))}
      </div>
    </div>
  );
}
