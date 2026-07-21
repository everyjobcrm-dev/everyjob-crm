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
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">EveryJob CRM</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm text-slate-400 sm:text-base">{subtitle}</p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          {error ? (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {success}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
