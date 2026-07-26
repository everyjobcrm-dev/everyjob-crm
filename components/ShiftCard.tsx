"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Shirt, Timer, UserCheck, Wallet } from "lucide-react";

type ShiftCardProps = {
  className?: string;
};

const tiles = [
  { label: "תפקיד", value: "הגשה", icon: UserCheck },
  { label: "תעריף", value: "₪52 / שעה", icon: Wallet },
  { label: "תחילת משמרת", value: "היום 18:00", icon: Clock3 },
  { label: "סיום משוער", value: "02:00", icon: Timer },
];

export function ShiftCard({ className = "" }: ShiftCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: -2 }}
      viewport={{ once: true }}
      whileHover={{ rotate: 0, y: -4 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-sm rounded-[28px] border border-brass/20 bg-cream p-6 text-right shadow-[0_30px_80px_-25px_rgba(0,0,0,0.65)] sm:p-7 ${className}`}
      style={{ transformOrigin: "center" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-deep">
          המשמרת הבאה שלך
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> מאושר
        </span>
      </div>

      <h3 className="mt-3 font-display text-2xl leading-tight text-obsidian">
        חתונה בחוות רונית
      </h3>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-obsidian/[0.04] p-3.5">
            <Icon className="h-4 w-4 text-brass-deep" />
            <p className="mt-2 text-[11px] text-obsidian/45">{label}</p>
            <p className="text-sm font-bold text-obsidian">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-brass/25 bg-brass/10 p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brass-deep">
          <Shirt className="h-3.5 w-3.5" /> קוד לבוש
        </p>
        <p className="mt-1 text-sm text-obsidian/75">
          חולצה לבנה, מכנס שחור, נעליים סגורות.
        </p>
      </div>

      <button
        type="button"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] hover:bg-emerald-700 active:scale-[0.98]"
      >
        <CheckCircle2 className="h-4 w-4" /> צ&apos;ק-אין למשמרת
      </button>
    </motion.div>
  );
}