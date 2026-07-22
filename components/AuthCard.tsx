import { SplitAuthShell } from "@/components/ui/split-auth-shell";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  error?: string | null;
  success?: string | null;
};

export function AuthCard({ title, subtitle, children, error, success }: AuthCardProps) {
  return (
    <SplitAuthShell title={title} subtitle={subtitle} error={error} success={success}>
      {children}
    </SplitAuthShell>
  );
}
