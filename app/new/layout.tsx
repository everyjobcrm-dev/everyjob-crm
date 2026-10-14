import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getAuthContext } from "@/lib/auth/guards";

// /new sits in the same app shell as every other signed-in page. The page itself keeps its own
// canCreateEvents() gate and createEvent() re-checks the role server-side (AGENTS.md 5.2).
export default async function NewEventLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx.ok) {
    redirect("/login");
  }

  return (
    <AppShell role={ctx.role} canCreateEventsFlag={ctx.profile.can_create_events}>
      {children}
    </AppShell>
  );
}
