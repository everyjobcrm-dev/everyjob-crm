export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      {/* Manager portal header */}
      <header className="border-b border-brass/10 bg-surface px-6 py-4">
        <h1 className="font-display text-xl text-cream">ניהול אירועים</h1>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
