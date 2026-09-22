import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Warehouse, Network, Truck, ShieldCheck } from "lucide-react";
import { getCurrentUser, ROLE_HOME, safeNext } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoAccounts } from "@/components/auth/DemoAccounts";

export const metadata = { title: "Staff sign in — subsel operations", robots: { index: false, follow: false } };

const CONSOLES = [
  { icon: LayoutDashboard, name: "Admin", text: "Orders, sellers, listings, inventory, returns and refunds" },
  { icon: Warehouse, name: "Warehouse", text: "Scan-based picking, packing and QR labels" },
  { icon: Network, name: "Hub", text: "Intake, sorting and dispatch across the network" },
  { icon: Truck, name: "Courier", text: "Runsheet, OTP delivery, COD and return pickups" },
];

export default async function StaffLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  if (user && user.role !== "CUSTOMER" && user.role !== "VENDOR") redirect(safeNext(searchParams.next, ROLE_HOME[user.role]));

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/[0.04]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full bg-white/[0.03]" aria-hidden />
        <Logo tone="white" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Operations</p>
          <h1 className="mt-4 max-w-md font-display text-[3.2rem] font-medium leading-[1] tracking-[-0.035em]">One console for the whole network.</h1>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {CONSOLES.map((c) => (
              <li key={c.name} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                <c.icon size={18} strokeWidth={1.75} className="text-white/80" />
                <p className="mt-4 text-sm font-medium">{c.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={14} /> Every action is logged against your account.
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <p className="eyebrow">Staff only</p>
          <h2 className="h-display mt-3 text-[2.4rem] leading-none">Sign in</h2>
          <p className="mb-8 mt-3 text-sm text-slate">Use the work email your administrator gave you. You will land on your own console.</p>
          <LoginForm portal="staff" next={searchParams.next} submitLabel="Sign in to console" />
          <p className="mt-6 text-xs text-slate">Forgot your password? Ask your administrator to reset it.</p>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-sm">
            <Link href="/" className="text-slate hover:text-ink">Storefront</Link>
            <Link href="/vendor/login" className="text-slate hover:text-ink">Seller login</Link>
          </div>
          <DemoAccounts
            accounts={[
              ["Admin", "admin@subsel.demo"],
              ["Warehouse", "floor@subsel.demo"],
              ["Hub", "hub@subsel.demo"],
              ["Courier", "ravi@subsel.demo"],
            ]}
          />
        </div>
      </main>
    </div>
  );
}
