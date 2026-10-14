import type { ReactNode } from "react";
import type { AppRole } from "@/lib/auth/permissions";
import { buildNav, homeFor, ROLE_LABEL } from "@/lib/nav";
import { ShellNav } from "@/components/shell/ShellNav";

/**
 * The one app shell for every role (employee look: obsidian background, cream type, brass accents). The nav is
 * composed from { role, can_create_events } in lib/nav.ts. It only decides what is shown; access is enforced by
 * middleware, the layout guards and requireRole() (AGENTS.md 5.2).
 */
export function AppShell({
  role,
  canCreateEventsFlag,
  children,
}: {
  role: AppRole;
  canCreateEventsFlag: boolean;
  children: ReactNode;
}) {
  const sections = buildNav({ role, can_create_events: canCreateEventsFlag });

  return (
    <div className="flex min-h-screen w-full flex-1 flex-col bg-obsidian text-cream">
      <ShellNav sections={sections} roleLabel={ROLE_LABEL[role]} homeHref={homeFor(role)} />
      {/* min-w-0 keeps wide children (tables, grids) from widening the page; they scroll inside their own wrappers */}
      <main className="min-w-0 flex-1 pb-28 lg:ps-60 lg:pb-0">
        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
