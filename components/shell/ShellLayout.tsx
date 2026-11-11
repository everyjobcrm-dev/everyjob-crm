import type { ReactNode } from "react";
import { getAuthContext } from "@/lib/auth/guards";
import { buildNav } from "@/lib/nav";
import { AppShell } from "@/components/shell/AppShell";

/**
 * Server wrapper: reads the caller's role from the database (never from the client) and renders the shared shell.
 * Route protection stays in middleware.ts and in each layout's own guard; this only builds the navigation.
 */
export async function ShellLayout({ children, width }: { children: ReactNode; width?: "narrow" | "wide" }) {
  const ctx = await getAuthContext();
  const nav = buildNav(ctx.ok ? ctx.profile : null);
  return (
    <AppShell nav={nav} width={width}>
      {children}
    </AppShell>
  );
}
