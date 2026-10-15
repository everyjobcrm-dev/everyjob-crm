"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  ClockCheck,
  History,
  Home,
  LayoutGrid,
  LogOut,
  UserRound,
  UserRoundCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { activeHref, type NavIcon, type NavItem, type NavSection } from "@/lib/nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  events: CalendarDays,
  shifts: History,
  profile: UserRound,
  staffEvents: CalendarRange,
  newEvent: CalendarPlus,
  dashboard: LayoutGrid,
  hours: ClockCheck,
  employees: Users,
  recruiters: UserRoundCheck,
  clients: Building2,
};

async function logout() {
  const supabase = createSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
  // Full reload so middleware re-runs on a clean request.
  window.location.href = "/login";
}

export function ShellNav({
  sections,
  roleLabel,
  homeHref,
}: {
  sections: NavSection[];
  roleLabel: string;
  homeHref: string;
}) {
  const pathname = usePathname();
  const active = activeHref(sections, pathname);
  const [sheetOpen, setSheetOpen] = useState(false);

  const main = sections.find((s) => s.id === "main")?.items ?? [];
  const manage = sections.find((s) => s.id === "manage")?.items ?? [];
  const manageActive = manage.some((i) => i.href === active);

  return (
    <>
      {/* Desktop: sidebar on the start edge (right in RTL) */}
      <aside
        aria-label="ניווט ראשי"
        className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-brass/10 bg-obsidian px-3 py-7 lg:flex"
      >
        <Brand homeHref={homeHref} roleLabel={roleLabel} />

        <nav className="mt-8 flex flex-1 flex-col gap-7 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.id}>
              {section.title && (
                <p className="mb-2 flex items-center gap-2 px-3 text-[11px] font-semibold tracking-wide text-brass">
                  {section.title}
                  <span className="h-px flex-1 bg-brass/20" aria-hidden="true" />
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <SideLink item={item} active={item.href === active} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-cream/70 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          התנתקות
        </button>
      </aside>

      {/* Mobile: slim header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-brass/10 bg-obsidian/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Brand homeHref={homeHref} roleLabel={roleLabel} />
        <button
          type="button"
          onClick={logout}
          aria-label="התנתקות"
          className="grid h-9 w-9 place-items-center rounded-md text-cream/70 transition-colors hover:text-cream"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        </button>
      </header>

      {/* Mobile: management sheet (staff only), opened from the "ניהול" tab */}
      {manage.length > 0 && sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="ניהול">
          <button
            type="button"
            aria-label="סגירה"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-t-xl border-t border-brass/20 bg-surface px-3 pb-3 pt-4">
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-xs font-semibold tracking-wide text-brass">ניהול</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="סגירה"
                className="grid h-8 w-8 place-items-center rounded-md text-cream/70"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
              {manage.map((item) => (
                <li key={item.href}>
                  <SideLink item={item} active={item.href === active} onNavigate={() => setSheetOpen(false)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Mobile: fixed bottom tab bar (the employee portal pattern) */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-stretch justify-around border-t border-brass/10 bg-obsidian/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
      >
        {main.map((item) => (
          <TabLink key={item.href} item={item} active={item.href === active} onNavigate={() => setSheetOpen(false)} />
        ))}
        {manage.length > 0 && (
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-cream/70"
          >
            <ClipboardList
              strokeWidth={manageActive || sheetOpen ? 2.25 : 1.6}
              className={`h-5 w-5 ${manageActive || sheetOpen ? "text-brass" : ""}`}
              aria-hidden="true"
            />
            <span className={manageActive ? "text-cream" : ""}>ניהול</span>
          </button>
        )}
      </nav>
    </>
  );
}

function Brand({ homeHref, roleLabel }: { homeHref: string; roleLabel: string }) {
  return (
    <Link href={homeHref} className="flex min-w-0 items-center gap-2.5 px-2">
      <span className="h-8 w-8 shrink-0 rounded-full bg-brass" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-display text-sm text-cream">everyJob</span>
        <span className="block truncate text-[11px] text-cream/70">{roleLabel}</span>
      </span>
    </Link>
  );
}

function SideLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-cream/[0.06] text-cream" : "text-cream/70 hover:bg-cream/[0.04] hover:text-cream"
      }`}
    >
      {active && (
        <span className="absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2 bg-brass" aria-hidden="true" />
      )}
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-brass" : ""}`} strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function TabLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-cream/70"
    >
      <Icon strokeWidth={active ? 2.25 : 1.6} className={`h-5 w-5 ${active ? "text-brass" : ""}`} aria-hidden="true" />
      <span className={`max-w-full truncate px-0.5 ${active ? "text-cream" : ""}`}>{item.label}</span>
    </Link>
  );
}
