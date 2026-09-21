import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/services/orders";
import { OrderCard } from "@/components/OrderCard";

export const metadata = { title: "My orders — subsel" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/orders");
  const orders = await listOrdersForUser(user.id);

  return (
    <div className="shell max-w-4xl py-10">
      <h1 className="h-display text-5xl">My orders</h1>
      <p className="mt-2 text-sm text-slate">Signed in as {user.fullName}. Every parcel shows its live scan trail.</p>

      {orders.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">No orders yet.</p>
          <p className="mt-1 text-sm text-slate">Place one and follow it from the warehouse shelf to your door.</p>
          <Link href="/shop?category=all" className="btn-primary mt-6">Shop Now</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
