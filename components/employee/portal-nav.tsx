"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, History, UserRound } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "בית", icon: Home },
  { href: "/events", label: "אירועים", icon: CalendarDays },
  { href: "/shifts", label: "משמרות", icon: History },
  { href: "/profile", label: "פרופיל", icon: UserRound },
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: slim icon rail on the start edge (right side in RTL) */}
      <nav
        aria-label="ניווט ראשי"
        className="hidden lg:flex fixed inset-y-0 start-0 z-40 w-20 flex-col items-center gap-1 border-e border-brass/10 bg-obsidian py-8"
      >
        <div className="mb-8 h-9 w-9 rounded-full bg-brass" aria-hidden="true" />
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group relative flex w-full flex-col items-center gap-1.5 py-3.5 text-[11px] font-medium text-cream/45 transition-colors hover:text-cream"
            >
              {active && (
                <span
                  className="absolute end-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-brass"
                  aria-hidden="true"
                />
              )}
              <Icon strokeWidth={active ? 2.25 : 1.6} className={`h-5 w-5 ${active ? "text-brass" : ""}`} />
              <span className={active ? "text-cream" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        aria-label="ניווט ראשי"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-brass/10 bg-obsidian/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium text-cream/45"
            >
              <Icon strokeWidth={active ? 2.25 : 1.6} className={`h-5 w-5 ${active ? "text-brass" : ""}`} />
              <span className={active ? "text-cream" : ""}>{label}</span>
              {active && <span className="h-1 w-1 rounded-full bg-brass" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
