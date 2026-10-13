import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, rulesFrom } from "@/lib/settings";
import { listOrdersPageForUser } from "@/lib/services/orders";
import { OrderCard } from "@/components/OrderCard";
import { Pagination } from "@/components/Pagination";
import { pageFromParam } from "@/lib/paginate";

export const metadata = { title: "My orders — subsel" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/orders");
  const [orders, settings] = await Promise.all([
    listOrdersPageForUser(user.id, pageFromParam(searchParams.page)),
    getSettings(),
  ]);
  const windowDays = rulesFrom(settings).returnWindowDays;

  return (
    <div className="shell max-w-4xl py-10">
      <h1 className="h-display text-[2.2rem] sm:text-5xl">My orders</h1>
      <p className="mt-2 text-sm text-slate">Signed in as {user.fullName}. Every parcel shows its live scan trail.</p>

      {orders.total === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">No orders yet.</p>
          <p className="mt-1 text-sm text-slate">Place one and follow it from the warehouse shelf to your door.</p>
          <Link href="/shop?category=all" className="btn-primary mt-6">Shop Now</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-6">
            {orders.items.map((o) => (
              <OrderCard key={o.id} order={o} returnWindowDays={windowDays} />
            ))}
          </div>
          <Pagination
            className="mt-8"
            page={orders.page}
            pageCount={orders.pageCount}
            total={orders.total}
            pageSize={orders.pageSize}
            label="orders"
            hrefFor={(page) => (page === 1 ? "/orders" : `/orders?page=${page}`)}
          />
        </>
      )}
    </div>
  );
}
