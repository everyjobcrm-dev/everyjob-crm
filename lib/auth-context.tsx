"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserProfile } from "@/lib/supabase/auth";

type ProfileState = {
  first_name: string | null;
  last_name: string | null;
  tz: string | null;
  birth_date: string | null;
  email: string | null;
  role: string | null;
  isRecruiter: boolean;
};

type AuthContextValue = {
  user: User | null;
  profile: ProfileState | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const refreshProfile = async () => {
    if (!supabase || !user?.id) {
      setProfile(null);
      return;
    }

    const data = await getUserProfile(supabase, user.id);
    if (data) {
      setProfile({
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        tz: data.tz ?? null,
        birth_date: data.birth_date ?? null,
        email: data.email ?? null,
        role: data.role ?? null,
        isRecruiter: data.role === "recruiter",
      });
      return;
    }

    setProfile(null);
  };

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      const result = await supabase.auth.getSession();
      const session = result.data.session;

      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshProfile();
      }
      setLoading(false);
    };

    initialize();

    const authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => authSubscription.data.subscription.unsubscribe();
  }, [supabase]);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile, signOut }),
    [user, profile, loading, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
