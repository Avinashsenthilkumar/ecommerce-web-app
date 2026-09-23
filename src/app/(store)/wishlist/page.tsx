import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listWishlist } from "@/lib/services/wishlist";
import { ProductCard } from "@/components/ProductCard";

export const metadata = { title: "Your wishlist — subsel" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/wishlist");
  const items = await listWishlist(user.id);

  return (
    <div className="shell py-10">
      <h1 className="h-display text-[2.2rem] sm:text-5xl">Your wishlist</h1>
      <p className="mt-2 text-sm text-slate">{items.length} saved item(s). Prices and stock update live.</p>
      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">Nothing saved yet.</p>
          <p className="mt-1 text-sm text-slate">Tap the heart on any product to keep it here.</p>
          <Link href="/shop?category=all" className="btn-primary mt-6">Browse products</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <ProductCard key={i.id} p={i.product} saved />
          ))}
        </div>
      )}
    </div>
  );
}
