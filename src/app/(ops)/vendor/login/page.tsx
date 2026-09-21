import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoAccounts } from "@/components/auth/DemoAccounts";

export const metadata = { title: "Seller login — subsel" };

export default async function VendorLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "VENDOR") redirect("/vendor");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-pine p-12 text-white lg:flex">
        <Logo tone="white" />
        <div>
          <h1 className="font-display text-5xl leading-[1.05]">Sell through a network that scans every parcel.</h1>
          <p className="mt-5 max-w-md text-white/80">
            List products, stock them in our Chennai and Thanjavur fulfilment centres and track every unit from shelf to doorstep.
          </p>
        </div>
        <p className="text-xs text-white/60">Commission is settled after the return window closes.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-bold">Seller login</h2>
          <p className="mb-6 mt-1 text-sm text-slate">Manage your catalogue, stock and sales.</p>
          <LoginForm portal="vendor" submitLabel="Sign in to Seller Central" />
          <p className="mt-6 text-sm text-slate">
            Shopping instead? <Link href="/login" className="font-semibold text-pine hover:underline">Customer sign in</Link>
          </p>
          <DemoAccounts accounts={[["Seller", "aureli@subsel.demo"], ["Seller", "coastal@subsel.demo"]]} />
        </div>
      </div>
    </div>
  );
}
