import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SellerRegisterForm } from "@/components/vendor/SellerRegisterForm";

export const metadata = { title: "Become a seller — subsel" };

const STEPS = [
  ["Apply", "Tell us about your business. Takes 3 minutes."],
  ["Get approved", "Our team verifies your details, usually within a day."],
  ["List products", "Each listing is reviewed before it goes live."],
  ["Sell & get paid", "We store, pack, ship and deliver. You track every unit."],
];

export default async function SellerRegisterPage() {
  const user = await getCurrentUser();
  if (user?.role === "VENDOR") redirect("/vendor");
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Logo tone="white" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Sell on subsel</p>
          <h1 className="mt-4 font-display text-5xl font-medium leading-[1.02] tracking-[-0.035em]">Reach buyers across Tamil Nadu with our own delivery network.</h1>
          <ol className="mt-10 space-y-5">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs tabular">{i + 1}</span>
                <span>
                  <span className="block text-sm font-medium">{t}</span>
                  <span className="block text-sm text-white/60">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-white/50">Commission is settled after the 7-day return window closes.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="h-display text-[2.2rem] leading-tight">Seller application</h2>
          <p className="mb-8 mt-2 text-sm text-slate">
            Already applied? <Link href="/vendor/login" className="text-ink underline underline-offset-4">Sign in to check status</Link>
          </p>
          <SellerRegisterForm />
        </div>
      </div>
    </div>
  );
}
