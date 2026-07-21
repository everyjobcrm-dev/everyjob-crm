import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">EveryJob CRM</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Authentication and role-based access are ready.</h1>
          <p className="mt-4 text-lg text-slate-400">
            Use the login, registration, and password reset flows above to reach the protected admin and employee areas.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400" href="/login">
            Sign in
          </Link>
          <Link className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300" href="/register">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
