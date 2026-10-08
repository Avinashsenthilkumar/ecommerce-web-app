import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { variantPurchasableStock } from "@/lib/services/inventory";
import {
  cartTotals,
  getCart,
  lineUnitPrice,
  storeRules,
} from "@/lib/services/cart";
import { listAddresses } from "@/lib/services/account";
import { CartView, type CartLineView } from "@/components/CartView";

export const metadata = { title: "Cart — subsel" };

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/cart");
  const [cart, addresses, rules] = await Promise.all([
    getCart(user.id),
    listAddresses(user.id),
    storeRules(),
  ]);

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
    stock: variantPurchasableStock(l.variant.inventory),
  }));

  return (
    <div className="shell pt-10">
      <CartView
        lines={lines}
        totals={cartTotals(cart.items, rules)}
        rules={{
          discountPercent: rules.discountPercent,
          gstPercent: rules.gstPercent,
          paymentMethods: rules.paymentMethods,
        }}
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
