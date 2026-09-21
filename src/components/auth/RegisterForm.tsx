"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [f, setF] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callApi("/api/auth/register", "POST", f);
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="fullName">Your name</label>
        <input id="fullName" className="input" autoComplete="name" value={f.fullName} onChange={set("fullName")} required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="phone">Mobile number</label>
        <input id="phone" className="input" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" className="input" autoComplete="email" value={f.email} onChange={set("email")} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input" autoComplete="new-password" minLength={8} value={f.password} onChange={set("password")} required />
        <p className="mt-1 text-xs text-slate">At least 8 characters.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-sale">{error}</p>}
      <button disabled={busy} className="btn-primary w-full py-3">{busy ? "Creating account…" : "Create account"}</button>
      <p className="text-xs leading-relaxed text-slate">By creating an account you agree to subsel&apos;s conditions of use and privacy notice.</p>
    </form>
  );
}
