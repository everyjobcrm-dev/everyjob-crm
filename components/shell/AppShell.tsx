"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
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
    <div className="min-h-screen bg-canvas text-ink">
      {/* Desktop sidebar */}
      <aside
        aria-label="ניווט ראשי"
        className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-line bg-surface px-3 py-5 lg:flex"
      >
        <Link href={HOME_BY_ROLE[nav.role]} className="mb-7 flex items-center justify-between gap-2 px-2">
          <Image src="/images/everyJob-logo.png" alt="everyJob" width={738} height={411} priority className="h-11 w-auto" />
          <span className="rounded-md bg-surface2 px-2 py-1 text-[11px] font-semibold text-muted">{nav.roleLabel}</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto [scrollbar-width:thin]">
          {isStaff && <NavSection title="ניהול" items={nav.manage} pathname={pathname} />}
          <NavSection title={isStaff ? "העבודה שלי" : undefined} items={nav.work} pathname={pathname} />
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-rose-500/10 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          התנתקות
        </button>
      </aside>

      {/* Mobile: management strip for staff */}
      {isStaff && (
        <nav
          aria-label="ניווט ניהול"
          className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-line bg-ink/40 px-3 py-2 backdrop-blur-sm lg:hidden"
        >
          <span className="me-1 shrink-0 text-xs font-semibold text-muted">ניהול</span>
          {nav.manage.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "bg-ink text-white" : "text-ink/80 hover:bg-ink/5"
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

      {/* Mobile: bottom tab bar with the work items. Logout lives on the profile screen, away from the thumb. */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line bg-ink/40 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
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
                active ? "text-ink" : "text-muted"
              }`}
            >
              <Icon strokeWidth={active ? 2.25 : 1.6} className={`h-5 w-5 ${active ? "text-primary-soft" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavSection({ title, items, pathname }: { title?: string; items: NavItem[]; pathname: string | null }) {
  return (
    <div>
      {title && <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted">{title}</p>}
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-surface2 font-semibold text-ink"
                    : "text-ink/80 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary-soft" : ""}`} strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
