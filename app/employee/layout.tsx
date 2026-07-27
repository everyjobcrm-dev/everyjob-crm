import type { ReactNode } from "react";
import { PortalNav } from "@/components/employee/portal-nav";

export default function EmployeePortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian text-cream">
      <PortalNav />
      <main className="pb-24 lg:pb-0 lg:ps-20">
        <div className="mx-auto max-w-5xl px-5 pt-8 lg:px-10 lg:pt-12">{children}</div>
      </main>
    </div>
  );
}
