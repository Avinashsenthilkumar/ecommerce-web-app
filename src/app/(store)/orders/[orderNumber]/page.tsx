import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, rulesFrom } from "@/lib/settings";
import { getOrderForUser } from "@/lib/services/orders";
import { OrderCard } from "@/components/OrderCard";

export async function generateMetadata({ params }: { params: { orderNumber: string } }) {
  return { title: `${params.orderNumber} — subsel` };
}

export default async function OrderDetailPage({ params, searchParams }: { params: { orderNumber: string }; searchParams: { placed?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/orders");
  const [order, settings] = await Promise.all([getOrderForUser(params.orderNumber, user), getSettings()]);
  if (!order) notFound();

  return (
    <div className="shell max-w-5xl py-10">
      <Link href="/orders" className="text-xs font-semibold text-slate hover:text-ink">All orders</Link>
      {searchParams.placed && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-pineSoft p-5">
          <CheckCircle2 className="mt-0.5 shrink-0 text-pine" size={20} />
          <div>
            <p className="font-bold">Order placed</p>
            <p className="text-sm text-slate">
              We will confirm it, reserve stock at the nearest fulfilment centre and send each parcel through the hub network. This page updates at every scan.
            </p>
          </div>
        </div>
      )}
      <h1 className="h-display mb-6 mt-4 text-4xl">Track order</h1>
      <OrderCard order={order} expanded returnWindowDays={rulesFrom(settings).returnWindowDays} />
    </div>
  );
}
