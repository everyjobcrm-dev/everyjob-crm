"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCheck2, Landmark, LogOut, ArrowLeft } from "lucide-react";
import { ROLE_LABEL } from "@/lib/nav";
import { isAppRole } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
   
  const displayName = (() => {
    const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    if (profileName) return profileName;

    const metadataName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (metadataName) return metadataName;

    const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    return emailName || "משתמש/ת";
  })();


  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingCredits, setPendingCredits] = useState({ count: 0, amount: 0 });

  useEffect(() => {
    if (profile?.role !== "recruiter" || !user?.id) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    supabase
      .from("v_recruiter_pending_credits")
      .select("pending_recruitment_count, pending_recruitment_amount")
      .eq("recruiter_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPendingCredits({
            count: Number(data.pending_recruitment_count),
            amount: Number(data.pending_recruitment_amount),
          });
        }
      });
  }, [profile?.role, user?.id]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    setLoggingOut(true);
    await supabase.auth.signOut();
    // Full reload (not router.replace) so middleware re-runs on a clean
    // request and any stale client-side auth state is discarded.
    window.location.href = "/login";
  }

  return (
    <div className="pb-10">
      <header className="mb-8 flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-sun font-display text-xl text-ink"
          aria-hidden="true"
        >
          {loading ? "..." : displayName[0]}
        </div>
        <div>
          <h1 className="font-display text-2xl text-ink">{loading ? "..." : displayName}</h1>
          <p className="text-sm text-muted">{isAppRole(profile?.role) ? ROLE_LABEL[profile.role] : ""}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="flex items-center justify-between card p-5">
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-5 w-5 text-muted" strokeWidth={1.6} aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-ink">טופס 101</h2>
              <p className="text-sm text-muted">נדרש לעדכון שכר</p>
            </div>
          </div>
          <Link href="/employee/101form" className="btn btn-secondary btn-sm">
            לטופס
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </section>

        <section className="flex items-center justify-between card p-5">
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-muted" strokeWidth={1.6} aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-ink">פרטי בנק</h2>
              <p className="text-sm text-muted">לצורך העברת שכר</p>
            </div>
          </div>
          <span className="rounded-sm bg-ink/10 px-2 py-1 text-[11px] font-semibold text-muted">זמין בקרוב</span>
        </section>

        {profile?.role === "recruiter" && (
          <section className="rounded-lg border border-primary/20 bg-surface p-5 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-ink">זיכויי גיוס ממתינים</h2>
                <p className="mt-1 text-sm text-muted">הנתונים מחושבים בזמן אמת. המימוש מתבצע על ידי מנהל/ת באירוע.</p>
              </div>
              <div className="text-end">
                <p className="font-display text-2xl text-ink tabular-nums">{pendingCredits.count}</p>
                <p className="text-xs text-muted">זיכויים</p>
              </div>
            </div>
            <p className="mt-4 text-lg font-semibold text-primary-soft tabular-nums">
              ₪{pendingCredits.amount.toLocaleString("he-IL", { maximumFractionDigits: 2 })}
            </p>
          </section>
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="btn btn-danger mt-8"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        {loggingOut ? "מתנתק..." : "התנתקות"}
      </button>
    </div>
  );
}