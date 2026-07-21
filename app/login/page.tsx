import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
