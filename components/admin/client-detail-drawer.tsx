"use client";

import { motion } from "framer-motion";
import { X, MapPin, Phone, User, Award } from "lucide-react";
import { type ClientWithMetrics, formatILS } from "@/lib/admin/clients-data";

export function ClientDetailDrawer({
  client,
  onClose,
}: {
  client: ClientWithMetrics;
  onClose: () => void;
}) {
  const sortedShifts = [...client.shifts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="client-drawer-title" className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm"
      />

      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 end-0 flex h-full w-full max-w-lg flex-col border-s border-cream/10 bg-obsidian shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between border-b border-cream/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5]/15 font-display text-xl text-[#8b85f5]">
              {client.name.charAt(0)}
            </div>
            <div>
              <h2 id="client-drawer-title" className="font-display text-xl text-cream">
                {client.name}
              </h2>
              <p className="text-sm text-cream/45">{client.industry}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-2 text-cream/50 hover:bg-cream/5 hover:text-cream"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Contact + address */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-cream/10 bg-surface p-3.5 text-sm">
              <User className="h-4 w-4 shrink-0 text-cream/40" aria-hidden="true" />
              <span className="truncate text-cream/80">{client.contactName}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-cream/10 bg-surface p-3.5 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-cream/40" aria-hidden="true" />
              <span dir="ltr" className="truncate text-cream/80">
                {client.contactPhone}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-cream/10 bg-surface p-3.5 text-sm sm:col-span-2">
              <MapPin className="h-4 w-4 shrink-0 text-cream/40" aria-hidden="true" />
              <span className="truncate text-cream/80">{client.address}</span>
            </div>
          </div>

          {/* Summary metrics */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-cream/10 bg-surface2 p-4">
              <p className="text-[11px] text-cream/40">שעות</p>
              <p className="mt-1 font-display text-2xl text-cream tabular-nums">{client.totalHours}</p>
            </div>
            <div className="rounded-xl border border-[#D4FF00]/20 bg-surface2 p-4">
              <p className="text-[11px] text-cream/40">לתשלום</p>
              <p className="mt-1 font-display text-2xl text-[#D4FF00] tabular-nums">
                {formatILS(client.totalPayout)}
              </p>
            </div>
            <div className="rounded-xl border border-cream/10 bg-surface2 p-4">
              <p className="flex items-center gap-1 text-[11px] text-cream/40">
                <Award className="h-3 w-3" aria-hidden="true" />
                בונוס
              </p>
              <p className="mt-1 font-display text-2xl text-cream tabular-nums">
                {formatILS(client.recruiterBonus)}
              </p>
            </div>
          </div>

          {/* Shift breakdown */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-cream/70">פירוט משמרות · {client.shifts.length}</h3>
            <div className="overflow-hidden rounded-2xl border border-cream/10">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-cream/10 bg-surface text-cream/45">
                    <th scope="col" className="px-3.5 py-2.5 text-start font-medium">
                      עובד/ת
                    </th>
                    <th scope="col" className="px-3.5 py-2.5 text-start font-medium">
                      תפקיד
                    </th>
                    <th scope="col" className="px-3.5 py-2.5 text-start font-medium">
                      תאריך
                    </th>
                    <th scope="col" className="px-3.5 py-2.5 text-start font-medium">
                      שעות
                    </th>
                    <th scope="col" className="px-3.5 py-2.5 text-start font-medium">
                      סה&quot;כ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream/10 bg-surface">
                  {sortedShifts.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3.5 py-3 font-medium text-cream">{s.employeeName}</td>
                      <td className="px-3.5 py-3 text-cream/60">{s.role}</td>
                      <td className="px-3.5 py-3 tabular-nums text-cream/60">{s.date}</td>
                      <td className="px-3.5 py-3 tabular-nums text-cream/70">{s.hours}</td>
                      <td className="px-3.5 py-3 tabular-nums font-semibold text-cream">
                        {formatILS(s.hours * s.hourlyRate)}
                      </td>
                    </tr>
                  ))}
                  {sortedShifts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3.5 py-8 text-center text-cream/40">
                        אין משמרות רשומות החודש עבור לקוח זה.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}