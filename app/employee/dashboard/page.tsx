"use client";

import { BentoDashboard } from "@/components/employee/bento-dashboard";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();

  // TODO: replace mock data with Supabase queries scoped to the authenticated employee
  const offers = [
    { id: "1", role: "דיילת אירוח — כנס הייטק", location: "תל אביב", date: "חמישי, 20:00", wage: "₪55/שעה" },
    { id: "2", role: "ברמן/ית — אירוע פרטי", location: "רמת גן", date: "שישי, 19:00", wage: "₪60/שעה" },
    { id: "3", role: "מלצר/ית — חתונה", location: "הרצליה", date: "שבת, 18:30", wage: "₪58/שעה" },
  ];

  const announcements = [
    { id: "1", title: "עדכון שכר לחודש הבא", body: "תשלומים יועברו החל מה-1 לחודש, כרגיל.", date: "לפני יומיים" },
    { id: "2", title: "משמרות חדשות באזור המרכז", body: "נפתחו עשרות משרות חדשות באזור גוש דן.", date: "לפני 5 ימים" },
  ];

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

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-sm text-cream/50">שלום,</p>
        <h1 className="font-display text-3xl text-cream">{loading ? "..." : displayName}</h1>
        <div className="mt-4 h-px w-16 hairline-gold-dark" aria-hidden="true" />
      </header>
      <BentoDashboard
        offers={offers}
        form101Filled={false}
        announcements={announcements}
        nearbyGroupName="מלצרים · תל אביב והמרכז"
      />
    </div>
  );
}
