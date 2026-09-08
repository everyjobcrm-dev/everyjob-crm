"use client";

import { useState, useTransition } from "react";
import { approveCancellation, rejectCancellation, promoteWaitlist } from "@/app/manager/actions";
import { Check, X, ArrowUpCircle } from "lucide-react";

type Reg = {
  id: string;
  status: string;
  cancellation_requested_at: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null; phone: string | null } | null;
  event_roles: { id: string; role_name: string } | null;
};

export function RosterTable({ registrations }: { registrations: Reg[] }) {
  const byRole = registrations.reduce((acc, reg) => {
    const roleName = reg.event_roles?.role_name || "???";
    if (!acc[roleName]) acc[roleName] = [];
    acc[roleName].push(reg);
    return acc;
  }, {} as Record<string, Reg[]>);

  return (
    <div className="space-y-8">
      {Object.entries(byRole).map(([roleName, regs]) => {
        const confirmed = regs.filter(r => r.status !== "waitlisted" && !r.cancellation_requested_at);
        const cancellations = regs.filter(r => r.cancellation_requested_at);
        const waitlist = regs.filter(r => r.status === "waitlisted" && !r.cancellation_requested_at);

        return (
          <div key={roleName} className="rounded-xl border border-brass/10 bg-surface overflow-hidden">
            <div className="bg-surface2 px-4 py-3 border-b border-brass/10">
              <h3 className="font-semibold text-cream">{roleName}</h3>
            </div>
            
            <div className="p-4 space-y-6">
              {cancellations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-rose-400 mb-3 uppercase tracking-wider">????? ?????</h4>
                  <div className="space-y-2">
                    {cancellations.map(reg => <RegRow key={reg.id} reg={reg} type="cancellation" />)}
                  </div>
                </div>
              )}

              {confirmed.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-indigo-300 mb-3 uppercase tracking-wider">???? ?????</h4>
                  <div className="space-y-2">
                    {confirmed.map(reg => <RegRow key={reg.id} reg={reg} type="confirmed" />)}
                  </div>
                </div>
              )}

              {waitlist.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#D4FF00]/80 mb-3 uppercase tracking-wider">????? ?????</h4>
                  <div className="space-y-2">
                    {waitlist.map(reg => <RegRow key={reg.id} reg={reg} type="waitlist" />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RegRow({ reg, type }: { reg: Reg, type: "cancellation" | "confirmed" | "waitlist" }) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "approve_cancel" | "reject_cancel" | "promote") => {
    startTransition(async () => {
      if (action === "approve_cancel") await approveCancellation(reg.id);
      if (action === "reject_cancel") await rejectCancellation(reg.id);
      if (action === "promote") await promoteWaitlist(reg.id);
    });
  };

  const firstName = reg.profiles?.first_name || "";
  const lastName = reg.profiles?.last_name || "";
  const name = (firstName + " " + lastName).trim() || "???? ?? ????";

  return (
    <div className={"flex items-center justify-between p-3 rounded-lg border " + (type === "cancellation" ? "bg-rose-500/5 border-rose-500/20" : "bg-surface2 border-brass/5")}>
      <div>
        <p className="text-sm font-medium text-cream">{name}</p>
        <p className="text-xs text-cream/50">{reg.profiles?.phone || "??? ?????"}</p>
      </div>

      <div className="flex gap-2">
        {type === "cancellation" && (
          <>
            <button 
              disabled={isPending}
              onClick={() => handleAction("approve_cancel")}
              className="flex items-center gap-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> ??? ?????
            </button>
            <button 
              disabled={isPending}
              onClick={() => handleAction("reject_cancel")}
              className="flex items-center gap-1 bg-cream/5 text-cream/70 hover:bg-cream/10 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" /> ???
            </button>
          </>
        )}
        
        {type === "waitlist" && (
          <button 
            disabled={isPending}
            onClick={() => handleAction("promote")}
            className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            <ArrowUpCircle className="w-3 h-3" /> ??? ?????
          </button>
        )}
      </div>
    </div>
  );
}
