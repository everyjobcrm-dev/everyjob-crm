"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ClockCheck,
  History,
  Home,
  LayoutGrid,
  LogOut,
  UserRound,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HOME_BY_ROLE, isActive, type NavIcon, type NavItem, type NavModel } from "@/lib/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  events: CalendarDays,
  shifts: History,
  profile: UserRound,
  dashboard: LayoutGrid,
  staffEvents: CalendarRange,
  newEvent: CalendarPlus,
  hours: ClockCheck,
  employees: Users,
  recruiters: UserRoundCheck,
  clients: Building2,
};

const WIDTH = { narrow: "max-w-5xl", wide: "max-w-7xl" } as const;

async function logout() {
  const supabase = createSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
  window.location.href = "/login";
}

/**
 * One shell for every role: the employee items for everyone, plus a "ניהול" section for staff (lib/nav.ts).
 * Desktop: a sidebar on the start edge (right in RTL). Mobile: a bottom tab bar with the work items, and for staff a
 * horizontally scrollable management strip at the top.
 */
export function AppShell({
  nav,
  width = "narrow",
  children,
}: {
  nav: NavModel;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isStaff = nav.manage.length > 0;

  return (
    <div className="min-h-screen bg-obsidian text-cream">
      {/* Desktop sidebar */}
      <aside
        aria-label="ניווט ראשי"
        className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-cream/10 bg-obsidian px-3 py-6 lg:flex"
      >
        <Link href={HOME_BY_ROLE[nav.role]} className="mb-8 flex items-center gap-2.5 px-2">
          <span className="h-8 w-8 rounded-lg bg-brass" aria-hidden="true" />
          <span>
            <span className="block font-display text-base text-cream">everyJob</span>
            <span className="block text-xs text-cream/60">{nav.roleLabel}</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
          {isStaff && <NavSection title="ניהול" items={nav.manage} pathname={pathname} />}
          <NavSection title={isStaff ? "העבודה שלי" : undefined} items={nav.work} pathname={pathname} />
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-cream/70 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          התנתקות
        </button>
      </aside>

      {/* Mobile: management strip for staff */}
      {isStaff && (
        <nav
          aria-label="ניווט ניהול"
          className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-cream/10 bg-obsidian/95 px-3 py-2 backdrop-blur-sm lg:hidden"
        >
          <span className="me-1 shrink-0 text-xs font-semibold text-cream/60">ניהול</span>
          {nav.manage.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "bg-brass text-obsidian" : "text-cream/75 hover:bg-cream/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <main className="pb-24 lg:ps-60 lg:pb-0">
        <div className={`mx-auto w-full min-w-0 ${WIDTH[width]} px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10`}>{children}</div>
      </main>

      {/* Mobile: bottom tab bar with the work items (+ logout) */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-cream/10 bg-obsidian/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
      >
        {nav.work.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-cream" : "text-cream/65"
              }`}
            >
              <Icon strokeWidth={active ? 2.25 : 1.6} className={`h-5 w-5 ${active ? "text-brass" : ""}`} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={logout}
          aria-label="התנתקות"
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-cream/65"
        >
          <LogOut strokeWidth={1.6} className="h-5 w-5" aria-hidden="true" />
          יציאה
        </button>
      </nav>
    </div>
  );
}

function NavSection({ title, items, pathname }: { title?: string; items: NavItem[]; pathname: string | null }) {
  return (
    <div>
      {title && <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-cream/55">{title}</p>}
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-s-2 border-brass bg-brass/10 text-cream"
                    : "text-cream/75 hover:bg-cream/5 hover:text-cream"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-brass" : ""}`} strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
