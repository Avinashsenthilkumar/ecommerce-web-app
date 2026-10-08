import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { staffGate } from "@/lib/auth";
import { getAdminSalesAnalytics } from "@/lib/services/admin";
import { AccessGate } from "@/components/AccessGate";
import { OpsShell, Section, StatCard } from "@/components/OpsShell";
import { VendorTrendCharts } from "@/components/vendor/VendorTrendCharts";
import { AdminSalesReportDownload } from "@/components/admin/AdminSalesReportDownload";
import { inr } from "@/lib/format";

export const metadata = { title: "Sales & products — subsel admin" };

export default async function AdminAnalyticsPage() {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;

  const analytics = await getAdminSalesAnalytics();
  const stats = analytics.stats;

  return (
    <OpsShell
      title="Sales & products"
      subtitle="Store-wide sales, revenue, stock, and product performance"
      tabs={[]}
      active="/admin/analytics"
    >
      <div className="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Store performance</h2>
            <p className="text-xs text-slate">All sellers · cancelled orders excluded from sales</p>
          </div>
          <Link href="/admin" className="btn-outline btn-sm inline-flex items-center gap-2">
            Back to overview <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Products" value={stats.products} hint="All listings" />
          <StatCard label="Active products" value={stats.activeProducts} hint="Available on storefront" tone="pine" />
          <StatCard label="Units sold" value={stats.unitsSold} hint="Across all products" />
          <StatCard label="Orders" value={stats.orders} hint="With at least one product" />
          <StatCard label="Product revenue" value={inr(stats.revenue)} hint="Item sales, excluding cancelled" tone="pine" />
          <StatCard label="Available stock" value={stats.stock} hint="Active fulfilment centres" />
        </div>

        <Section title="Sales & revenue trends" hint="Daily, weekly, and monthly store totals.">
          <VendorTrendCharts trends={analytics.trends} />
        </Section>

        <Section title="Download sales report" hint="CSV includes time-period totals and individual product performance.">
          <AdminSalesReportDownload years={analytics.years} />
        </Section>

        <Section title={`Product performance (${analytics.products.length})`} hint="Every product, ranked by revenue.">
          {analytics.products.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate">Products will appear here when sellers add listings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs text-slate">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Seller</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Price</th>
                    <th className="px-4 py-3 text-right font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Orders</th>
                    <th className="px-4 py-3 text-right font-medium">Units sold</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {analytics.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-slate">{product.seller}</td>
                      <td className="px-4 py-3 text-xs">{product.status.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 text-right tabular">{inr(product.sellingPrice)}</td>
                      <td className="px-4 py-3 text-right tabular">{product.stock}</td>
                      <td className="px-4 py-3 text-right tabular">{product.orders}</td>
                      <td className="px-4 py-3 text-right tabular">{product.unitsSold}</td>
                      <td className="px-4 py-3 text-right font-medium tabular">{inr(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </OpsShell>
  );
}
