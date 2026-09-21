import Link from "next/link";
import { staffGate } from "@/lib/auth";
import { AccessGate } from "@/components/AccessGate";
import { getVendorDashboard } from "@/lib/services/vendor";
import { inr } from "@/lib/format";
import { OpsShell, Section, StatCard, Empty } from "@/components/OpsShell";
import { ProductImage } from "@/components/ProductImage";
import { RestockForm } from "@/components/vendor/RestockForm";
import { NewProductForm } from "@/components/vendor/NewProductForm";

export const metadata = { title: "Vendor console — subsel" };

const TABS = [
  { href: "/vendor", label: "Catalogue" },
];

export default async function VendorPage() {
  const { user, allowed } = await staffGate("VENDOR");
  if (!allowed || !user.vendor) return <AccessGate need="VENDOR" user={user} />;
  const d = await getVendorDashboard(user.vendor.id);
  const warehouses = d.warehouses.map((w) => ({ id: w.id, name: w.name }));

  return (
    <OpsShell title={d.vendor.businessName} subtitle={`Vendor console, ${d.vendor.commissionPercent}% platform commission`} tabs={TABS} active="/vendor">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={d.stats.products} hint="Listed on subsel" />
        <StatCard label="Units in stock" value={d.stats.unitsInStock} hint="Available to sell" />
        <StatCard label="Units sold" value={d.stats.unitsSold} hint="Excluding cancelled orders" />
        <StatCard label="Sales" value={inr(d.stats.revenue)} hint={`Est. payout ${inr(d.stats.payout)}`} tone="pine" />
      </div>

      <Section
        title="Catalogue & stock"
        hint="Add stock to any fulfilment centre. Customers see it instantly."
      >
        <div className="flex justify-end border-b border-line px-5 py-3">
          <NewProductForm categories={d.categories.map((c) => ({ id: c.id, name: c.name }))} warehouses={warehouses} />
        </div>
        {d.products.length === 0 ? (
          <Empty>No products yet. List your first one above.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {d.products.map((p) => (
              <li key={p.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[18rem_1fr]">
                <div className="flex gap-3">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-mist">
                    <ProductImage src={p.images[0]?.url} alt={p.name} className="h-full w-full" />
                  </div>
                  <div>
                    <Link href={`/product/${p.slug}`} className="text-sm font-bold hover:underline">{p.name}</Link>
                    <p className="text-xs text-slate">{p.brand.name}, {p.category.name}</p>
                    <p className="mt-1 text-sm font-semibold tabular">
                      {inr(p.sellingPrice)} <span className="text-xs font-normal text-slate line-through">{inr(p.mrp)}</span>
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm tabular">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate">
                        <th className="pb-2">SKU</th>
                        <th className="pb-2">Stock by warehouse</th>
                        <th className="pb-2">Add stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {p.variants.map((v) => (
                        <tr key={v.id}>
                          <td className="py-2 pr-3 align-top">
                            <b>{v.sku}</b>
                            <span className="block text-xs text-slate">{v.label}</span>
                          </td>
                          <td className="py-2 pr-3 align-top text-xs">
                            {v.inventory.length === 0
                              ? <span className="text-slate">No stock record</span>
                              : v.inventory.map((i) => (
                                  <span key={i.id} className="block">
                                    {i.warehouse.name}: <b className={i.available <= i.lowStockThreshold ? "text-amber" : ""}>{i.available}</b>
                                    <span className="text-slate"> available, {i.reserved + i.picked + i.packed} in fulfilment</span>
                                  </span>
                                ))}
                          </td>
                          <td className="py-2 align-top">
                            <RestockForm variantId={v.id} warehouses={warehouses} defaultWarehouseId={v.inventory[0]?.warehouseId} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </OpsShell>
  );
}
