"use client";

import { MapPin, FileCheck2, Landmark, Wallet, LogOut } from "lucide-react";

const PREFERRED_AREAS = ["תל אביב והמרכז", "השרון", "ירושלים"];

type DocStatus = "missing" | "pending" | "complete";

function StatusPill({ status }: { status: DocStatus }) {
  if (status === "complete") {
    return <span className="rounded-md bg-brass/10 px-2 py-1 text-[11px] font-semibold text-brass">הושלם</span>;
  }
  if (status === "pending") {
    return <span className="rounded-md bg-cream/10 px-2 py-1 text-[11px] font-semibold text-cream/70">בבדיקה</span>;
  }
  return <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-400">חסר</span>;
}

export default function ProfilePage() {
  // TODO: replace with the authenticated employee's row from Supabase
  const form101Status: DocStatus = "missing";
  const bankDetailsStatus: DocStatus = "complete";
  const totalEarned = 12480;

  function handleLogout() {
    // TODO: wire to Supabase auth.signOut() and redirect to /login
  }

  return (
    <div className="pb-10">
      <header className="mb-8 flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brass font-display text-xl text-obsidian"
          aria-hidden="true"
        >
          נ
        </div>
        <div>
          <h1 className="font-display text-2xl text-cream">נועה כהן</h1>
          <p className="text-sm text-cream/50">מלצרית · חברה מ-2024</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-brass/15 bg-surface p-5 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
            <h2 className="font-semibold text-cream">אזורים מועדפים</h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {PREFERRED_AREAS.map((area) => (
              <li key={area} className="rounded-md bg-cream/5 px-2.5 py-1 text-xs font-semibold text-cream/80">
                {area}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 rounded-md px-2 py-1 text-sm font-semibold text-brass hover:bg-brass/10"
          >
            עריכת אזורים
          </button>
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-brass/15 bg-surface p-5">
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-5 w-5 text-cream/50" strokeWidth={1.6} aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-cream">טופס 101</h2>
              <p className="text-sm text-cream/50">נדרש לעדכון שכר</p>
            </div>
          </div>
          <StatusPill status={form101Status} />
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-brass/15 bg-surface p-5">
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-cream/50" strokeWidth={1.6} aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-cream">פרטי בנק</h2>
              <p className="text-sm text-cream/50">לצורך העברת שכר</p>
            </div>
          </div>
          <StatusPill status={bankDetailsStatus} />
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-brass/25 bg-surface2 p-6 sm:col-span-2">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-60"
            style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(201,161,91,0.14), transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-cream/50">
            <Wallet className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
            <span className="text-sm">סך הכל הרווחת</span>
          </div>
          <p className="relative mt-2 font-display text-4xl text-cream tabular-nums">
            ₪{totalEarned.toLocaleString("he-IL")}
          </p>
        </section>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-rose-400/30 px-5 py-2.5 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        התנתקות
      </button>
    </div>
  );
}
