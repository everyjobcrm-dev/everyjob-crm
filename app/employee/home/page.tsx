import Link from "next/link";

export default function EmployeeHomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Employee</p>
        <h1 className="mt-3 text-3xl font-semibold">Employee home</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Employees and recruiters share this space. Recruiters can be identified later through a role-aware UI state.
        </p>
      </div>
    </main>
  );
}
