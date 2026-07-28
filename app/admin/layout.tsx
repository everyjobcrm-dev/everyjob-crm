import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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

  return (
    <div className="min-h-screen bg-obsidian text-cream">
      <AdminSidebar />
      <main className="lg:ps-64">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
