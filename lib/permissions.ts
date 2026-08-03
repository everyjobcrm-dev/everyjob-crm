"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * Thin wrapper around AuthContext — the actual role comparisons now live in
 * one place (lib/auth-context.tsx's refreshProfile), matching the existing
 * isRecruiter convention. This hook just gives components a stable name to
 * import and a hasExtendedAccess convenience flag.
 */
export type Permissions = {
  isAdmin: boolean;
  isRecruiter: boolean;
  isFieldManager: boolean;
  hasExtendedAccess: boolean;
  loading: boolean;
};

export function usePermissions(): Permissions {
  const { profile, loading } = useAuth();

  const isAdmin = profile?.role === "admin";
  const isRecruiter = profile?.isRecruiter ?? false;
  const isFieldManager = profile?.isFieldManager ?? false;

  return {
    isAdmin,
    isRecruiter,
    isFieldManager,
    hasExtendedAccess: isRecruiter || isFieldManager,
    loading,
  };
}