import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { cartTotals, getCart, lineUnitPrice } from "@/lib/services/cart";
import { listAddresses } from "@/lib/services/account";
import { CartView, type CartLineView } from "@/components/CartView";

export const metadata = { title: "Cart — subsel" };

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/cart");
  const [cart, addresses] = await Promise.all([getCart(user.id), listAddresses(user.id)]);

  const lines: CartLineView[] = cart.items.map((l) => ({
    id: l.id,
    slug: l.variant.product.slug,
    name: l.variant.product.name,
    brand: l.variant.product.brand.name,
    label: l.variant.label,
    sku: l.variant.sku,
    image: l.variant.product.images[0]?.url ?? null,
    unitPrice: lineUnitPrice(l),
    mrp: l.variant.product.mrp,
    quantity: l.quantity,
    stock: l.variant.inventory.reduce((s, i) => s + i.available, 0),
  }));

  return (
    <div className="shell pt-10">
      <CartView
        lines={lines}
        totals={cartTotals(cart.items)}
        addresses={addresses.map((a) => ({
          id: a.id,
          isDefault: a.isDefault,
          name: a.name,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          state: a.state,
          pincode: a.pincode,
        }))}
        userName={user.fullName}
        userPhone={user.phone ?? ""}
      />
    </div>
  );
}
