// GET form: works without client JS; the page reads ?month=YYYY-MM.
export function MonthPicker({ month }: { month: string }) {
  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">חודש</span>
        <input type="month" name="month" defaultValue={month} className="field" required />
      </label>
      <button type="submit" className="btn btn-secondary">
        הצגה
      </button>
    </form>
  );
}

const ils = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });
const hrs = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
export const money = (n: number) => ils.format(n);
export const hours = (n: number) => hrs.format(n);
