"use client";

import { motion } from "framer-motion";
import { AlertTriangle, MessageCircle, Megaphone } from "lucide-react";
import { OfferTicket } from "@/components/employee/OfferTicket";

export type ShiftOffer = {
  id: string;
  role: string;
  location: string;
  date: string;
  wage: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

const tileVariants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function BentoDashboard({
  offers,
  form101Filled,
  announcements,
  nearbyGroupName,
}: {
  offers: ShiftOffer[];
  form101Filled: boolean;
  announcements: Announcement[];
  nearbyGroupName: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:auto-rows-[minmax(120px,auto)] lg:grid-cols-6">
      {/* Open shift offers — rendered as a spread of waiting tickets */}
      <motion.section
        variants={tileVariants}
        initial="hidden"
        animate="show"
        custom={0}
        className="lg:col-span-4 lg:row-span-2"
        aria-labelledby="offers-heading"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="offers-heading" className="font-display text-xl text-cream">
            הצעות פתוחות למשמרות
          </h2>
          <span className="rounded-md bg-brass/10 px-2 py-1 text-[11px] font-semibold text-brass">
            {offers.length} פתוחות
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {offers.map((offer, i) => (
            <OfferTicket key={offer.id} {...offer} tilt={i % 2 === 0 ? -1.5 : 1.5} />
          ))}
          {offers.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-brass/20 px-4 py-8 text-center text-sm text-cream/50">
              אין כרגע הצעות פתוחות באזור שלך. נעדכן אותך ברגע שתתפרסם משמרת חדשה.
            </p>
          )}
        </div>
      </motion.section>

      {/* Form 101 warning */}
      <motion.section
        variants={tileVariants}
        initial="hidden"
        animate="show"
        custom={1}
        className={`rounded-2xl border p-5 lg:col-span-2 ${
          form101Filled ? "border-brass/15 bg-surface" : "border-rose-400/25 bg-rose-500/10"
        }`}
        aria-labelledby="f101-heading"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`h-5 w-5 ${form101Filled ? "text-cream/50" : "text-rose-400"}`}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <div>
            <h2 id="f101-heading" className="font-semibold text-cream">
              {form101Filled ? "טופס 101 מולא" : "מילאת טופס 101?"}
            </h2>
            <p className="mt-1 text-sm text-cream/50">
              {form101Filled
                ? "הטופס שלך תקין ומעודכן."
                : "בלי טופס 101 לא נוכל להעביר את התשלום על המשמרת הבאה."}
            </p>
            {!form101Filled && (
              <button
                type="button"
                className="mt-3 rounded-full bg-brass px-4 py-2 text-xs font-bold text-obsidian transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                למילוי עכשיו
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {/* WhatsApp quick action */}
      <motion.section
        variants={tileVariants}
        initial="hidden"
        animate="show"
        custom={2}
        className="rounded-2xl border border-brass/15 bg-surface2 p-5 lg:col-span-2"
        aria-labelledby="wa-heading"
      >
        <MessageCircle className="h-5 w-5 text-brass" strokeWidth={1.8} aria-hidden="true" />
        <h2 id="wa-heading" className="mt-3 font-semibold text-cream">
          קבוצת ווצאפ קרובה
        </h2>
        <p className="mt-1 text-sm text-cream/50">{nearbyGroupName}</p>
        <button
          type="button"
          className="mt-4 rounded-full border border-brass/30 px-4 py-2 text-xs font-bold text-brass transition-colors hover:bg-brass hover:text-obsidian"
        >
          הצטרפות לקבוצה
        </button>
      </motion.section>

      {/* Company announcements */}
      <motion.section
        variants={tileVariants}
        initial="hidden"
        animate="show"
        custom={3}
        className="rounded-2xl border border-brass/15 bg-surface p-6 lg:col-span-4"
        aria-labelledby="announcements-heading"
      >
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brass" strokeWidth={1.8} aria-hidden="true" />
          <h2 id="announcements-heading" className="font-display text-lg text-cream">
            הודעות מהחברה
          </h2>
        </div>
        <ul className="divide-y divide-brass/10">
          {announcements.map((a) => (
            <li key={a.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-cream">{a.title}</p>
                <span className="shrink-0 text-xs text-cream/40">{a.date}</span>
              </div>
              <p className="mt-1 text-sm text-cream/50">{a.body}</p>
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
