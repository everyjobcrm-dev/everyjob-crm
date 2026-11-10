const sameYear = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const otherYear = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-11-12" -> "יום חמישי, 12 בנובמבר" (year shown only when it is not the current one). Unparseable input is returned as is. */
export function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return (date.getUTCFullYear() === new Date().getFullYear() ? sameYear : otherYear).format(date);
}
