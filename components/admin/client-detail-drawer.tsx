"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Phone, User, Shirt, CalendarRange, StickyNote, Trash2 } from "lucide-react";
import type { ClientRecord } from "@/lib/admin/clients-data";
import { DeleteClientDialog } from "@/components/admin/delete-client-dialog";

export function ClientDetailDrawer({
  client,
  onClose,
  onDeleted,
}: {
  client: ClientRecord;
  onClose: () => void;
  onDeleted: (clientId: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

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
              <p className="text-sm text-cream/45">
                {client.status === "active" ? "לקוח פעיל" : "לקוח מושהה"}
              </p>
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
              <span className="truncate text-cream/80">{client.contactName ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-cream/10 bg-surface p-3.5 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-cream/40" aria-hidden="true" />
              <span dir="ltr" className="truncate text-cream/80">
                {client.contactPhone ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-cream/10 bg-surface p-3.5 text-sm sm:col-span-2">
              <MapPin className="h-4 w-4 shrink-0 text-cream/40" aria-hidden="true" />
              <span className="truncate text-cream/80">{client.address ?? "—"}</span>
            </div>
            {client.dressCode && (
              <div className="flex items-center gap-2.5 rounded-xl border border-cream/10 bg-surface p-3.5 text-sm sm:col-span-2">
                <Shirt className="h-4 w-4 shrink-0 text-cream/40" aria-hidden="true" />
                <span className="truncate text-cream/80">{client.dressCode}</span>
              </div>
            )}
          </div>

          {/* Events metric */}
          <div className="mt-5 rounded-xl border border-[#D4FF00]/20 bg-surface2 p-4">
            <p className="flex items-center gap-1.5 text-[11px] text-cream/40">
              <CalendarRange className="h-3 w-3" aria-hidden="true" />
              סה&quot;כ אירועים עם הלקוח
            </p>
            <p className="mt-1 font-display text-3xl text-[#D4FF00] tabular-nums">{client.eventsCount}</p>
          </div>

          {/* Preferred roles */}
          {client.preferredRoles.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-cream/70">תפקידים מועדפים ותעריף</h3>
              <div className="flex flex-wrap gap-2">
                {client.preferredRoles.map((r, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-cream/10 bg-surface px-3 py-1.5 text-sm text-cream/80"
                  >
                    {r.role} <span className="text-cream/40">·</span> ₪{r.rate}/שעה
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-cream/70">
                <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                הערות
              </h3>
              <p className="whitespace-pre-wrap rounded-xl border border-cream/10 bg-surface p-4 text-sm leading-relaxed text-cream/70">
                {client.notes}
              </p>
            </div>
          )}

          {/* Danger zone */}
          <div className="mt-8 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <h3 className="text-sm font-semibold text-rose-400">אזור מסוכן</h3>
            <p className="mt-1 text-xs text-cream/50">מחיקת הלקוח היא פעולה בלתי הפיכה.</p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              מחיקת לקוח
            </button>
          </div>
        </div>
      </motion.aside>

      <AnimatePresence>
        {deleteOpen && (
          <DeleteClientDialog
            clientId={client.id}
            clientName={client.name}
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => onDeleted(client.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}