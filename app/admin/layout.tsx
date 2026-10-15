import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();

  // Supabase env vars missing/misconfigured — fail closed, not open.
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);

  if (role !== "admin") {
    redirect("/employee/dashboard");
  }

  // Admin always may create events; canCreateEvents() ignores the flag for this role.
  return (
    <AppShell role="admin" canCreateEventsFlag={false}>
      {children}
    </AppShell>
  );
}
