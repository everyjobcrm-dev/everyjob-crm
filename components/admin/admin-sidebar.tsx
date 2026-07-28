"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarRange, Users, Building2, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "דף הבית", icon: LayoutGrid },
  { href: "/admin/events", label: "אירועים ומשמרות", icon: CalendarRange },
  { href: "/admin/employees", label: "עובדים", icon: Users },
  { href: "/admin/clients", label: "לקוחות", icon: Building2 },
] as const;


export function AdminSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="ניווט מנהל"
        className="hidden lg:flex fixed inset-y-0 start-0 z-40 w-64 flex-col border-e border-brass/10 bg-obsidian px-4 py-6"
      >
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="h-8 w-8 rounded-full bg-brass" aria-hidden="true" />
          <div>
            <p className="font-display text-sm text-cream">everyJob</p>
            <p className="text-[11px] text-cream/40">ממשק מנהל</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-brass/10 text-brass" : "text-cream/60 hover:bg-cream/5 hover:text-cream"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream/50 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          התנתקות
        </button>
      </aside>

      {/* Mobile: horizontal tab bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-1 overflow-x-auto border-b border-brass/10 bg-obsidian/95 px-3 py-2.5 backdrop-blur-sm">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-brass text-obsidian" : "text-cream/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="ms-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-cream/40"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
