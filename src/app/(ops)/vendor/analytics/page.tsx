import { staffGate } from "@/lib/auth";
import { AccessGate } from "@/components/AccessGate";
import { SellerStatusScreen } from "@/components/vendor/SellerStatusScreen";
import { OpsShell, Section, StatCard } from "@/components/OpsShell";
import { VendorTrendCharts } from "@/components/vendor/VendorTrendCharts";
import { VendorSalesReportDownload } from "@/components/vendor/VendorSalesReportDownload";
import { getVendorAnalytics } from "@/lib/services/vendor";
import { inr } from "@/lib/format";
import { BarChart3, Package } from "lucide-react";

export const metadata = { title: "Business overview — subsel" };

const TABS = [
  { href: "/vendor", label: "Catalogue", icon: Package },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
];

export default async function VendorAnalyticsPage() {
  const { user, allowed } = await staffGate("VENDOR");
  if (!allowed || !user.vendor) return <AccessGate need="VENDOR" user={user} />;
  if (user.vendor.status !== "APPROVED") return <SellerStatusScreen vendor={user.vendor} />;

  const analytics = await getVendorAnalytics(user.vendor.id);
  const stats = analytics.stats;

  return (
    <OpsShell
      title={analytics.vendor.businessName}
      subtitle={`Business overview, ${analytics.vendor.commissionPercent}% platform commission`}
      tabs={TABS}
      active="/vendor/analytics"
    >
      <div className="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total products" value={stats.totalProducts} hint="All listings" />
          <StatCard label="Active products" value={stats.activeProducts} hint="Approved listings" tone="pine" />
          <StatCard label="Out of stock" value={stats.outOfStock} hint="No available units" tone="warn" />
          <StatCard label="Total sales" value={stats.unitsSold} hint="Units sold, excluding cancellations" />
          <StatCard label="Revenue" value={inr(stats.revenue)} hint={`Est. payout ${inr(stats.payout)}`} tone="pine" />
          <StatCard label="Orders" value={stats.orders} hint="Containing your products, excluding cancellations" />
          <StatCard label="Pending orders" value={stats.pendingOrders} hint="Awaiting fulfilment" tone="warn" />
          <StatCard label="Total stock" value={stats.totalStock} hint="Available units" />
          <StatCard label="Low stock" value={stats.lowStock} hint="At or below a location's threshold" tone="warn" />
        </div>

        <Section title="Sales & revenue trends" hint="Compare daily, weekly, or monthly results.">
          <VendorTrendCharts trends={analytics.trends} />
        </Section>

        <Section title="Download sales report" hint="Export seller sales and revenue by day, month, or year.">
          <VendorSalesReportDownload />
        </Section>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Top-selling products" hint="Ranked by units sold.">
            {analytics.topSellingProducts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate">Sales will appear here after your first order.</p>
            ) : (
              <ol className="divide-y divide-line">
                {analytics.topSellingProducts.map((product, index) => (
                  <li key={product.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-semibold">{index + 1}</span>
                      <span className="truncate text-sm font-medium">{product.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular">{product.unitsSold} sold</p>
                      <p className="text-xs text-slate">{inr(product.revenue)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Recent sales" hint="Latest orders containing your products.">
            {analytics.recentSales.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate">Recent orders will appear here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs text-slate">
                    <tr>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Units</th>
                      <th className="px-4 py-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {analytics.recentSales.map((sale) => (
                      <tr key={sale.orderNumber}>
                        <td className="px-4 py-3 font-medium">{sale.orderNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate">
                          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(sale.placedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">{sale.status.replaceAll("_", " ")}</td>
                        <td className="px-4 py-3 tabular">{sale.unitsSold}</td>
                        <td className="whitespace-nowrap px-4 py-3 tabular">{inr(sale.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <Section title="Product performance" hint="Units sold, revenue, current stock, and listing status by product.">
          {analytics.productPerformance.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate">Your product performance will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-left text-sm">
                <thead className="text-xs text-slate">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Units sold</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                    <th className="px-4 py-3 font-medium">Available stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {analytics.productPerformance.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-xs">{product.status.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 tabular">{product.unitsSold}</td>
                      <td className="px-4 py-3 tabular">{inr(product.revenue)}</td>
                      <td className="px-4 py-3 tabular">{product.units}</td>
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
