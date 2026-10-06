import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, rulesFrom } from "@/lib/settings";
import { getOrderForUser } from "@/lib/services/orders";
import { OrderCard } from "@/components/OrderCard";

export async function generateMetadata({
  params,
}: {
  params: { orderNumber: string };
}) {
  return { title: `${params.orderNumber} — subsel` };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { placed?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/orders");
  const [order, settings] = await Promise.all([
    getOrderForUser(params.orderNumber, user),
    getSettings(),
  ]);
  if (!order) notFound();

  return (
    <div className="shell max-w-5xl py-10">
      <Link
        href="/orders"
        className="text-xs font-semibold text-slate hover:text-ink"
      >
        All orders
      </Link>
      {searchParams.placed === "1" ? (
        <section className="mt-6 rounded-[24px] border border-pine/15 bg-pineSoft p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-pine">
              <CheckCircle2 size={26} strokeWidth={1.8} />
            </span>
            <div>
              <p className="eyebrow text-pine">Order received</p>
              <h1 className="h-display mt-1 text-3xl sm:text-4xl">
                Thanks, your order is in.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">
                We’ll confirm your order next. Stock and delivery updates will
                appear below as your parcel moves through the network.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-pine/15 pt-5">
            <div>
              <p className="eyebrow">Order number</p>
              <p className="mt-1 text-sm font-bold tabular">
                {order.orderNumber}
              </p>
            </div>
            <Link href="#order-details" className="btn-primary btn-sm">
              <ArrowDown size={15} />
              See order status
            </Link>
          </div>
        </section>
      ) : (
        <h1 className="h-display mb-6 mt-4 text-4xl">Track order</h1>
      )}
      <div
        id="order-details"
        className={searchParams.placed === "1" ? "mt-7 scroll-mt-6" : undefined}
      >
        {searchParams.placed === "1" && (
          <h2 className="h-display mb-4 text-2xl">Order details</h2>
        )}
        <OrderCard
          order={order}
          expanded
          returnWindowDays={rulesFrom(settings).returnWindowDays}
        />
      </div>
    </div>
  );
}
