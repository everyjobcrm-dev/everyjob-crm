import type { ReactNode } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";

// Every role may use the employee portal (staff can work shifts too); the shell adds the staff items by role.
export default function EmployeePortalLayout({ children }: { children: ReactNode }) {
  return <ShellLayout>{children}</ShellLayout>;
}
