import type { ReactNode } from "react";
import { ShellLayout } from "@/components/shell/ShellLayout";

// The page itself enforces who may create events (canCreateEvents + server action guard).
export default function NewEventLayout({ children }: { children: ReactNode }) {
  return <ShellLayout width="wide">{children}</ShellLayout>;
}
