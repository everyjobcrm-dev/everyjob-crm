import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold">Admin dashboard</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          This area is reserved for administrators. You can expand it with team management, reports, and recruiting controls.
        </p>
        <div className="mt-6">
        <Link className="text-sm font-semibold text-cyan-400 hover:text-cyan-300" href="/employee/dashboard">
          Go to employee dashboard
        </Link>
      </div>
      </div>
    </main>
  );
}
