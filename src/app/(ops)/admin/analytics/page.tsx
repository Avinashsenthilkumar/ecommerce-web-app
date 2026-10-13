import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { staffGate } from "@/lib/auth";
import { getAdminSalesAnalytics, getSellerSales } from "@/lib/services/admin";
import { AccessGate } from "@/components/AccessGate";
import { OpsShell, Section, StatCard } from "@/components/OpsShell";
import { VendorTrendCharts } from "@/components/vendor/VendorTrendCharts";
import { SalesReportPanel } from "@/components/admin/SalesReportPanel";
import { Pagination } from "@/components/Pagination";
import { paginate, pageFromParam } from "@/lib/paginate";
import { fmtDate, inr } from "@/lib/format";
import { TableScroll } from "@/components/TableScroll";

export const metadata = { title: "Sales & products — subsel admin" };

const ROWS = 15;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { page?: string; sellerPage?: string };
}) {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;

  const [analytics, sellers] = await Promise.all([
    getAdminSalesAnalytics(),
    getSellerSales(),
  ]);
  const stats = analytics.stats;

  const products = paginate(analytics.products, pageFromParam(searchParams.page), ROWS);
  const sellerRows = paginate(sellers.rows, pageFromParam(searchParams.sellerPage), ROWS);

  const hrefWith = (key: "page" | "sellerPage", value: number) => {
    const sp = new URLSearchParams();
    if (key === "page") {
      if (value > 1) sp.set("page", String(value));
      if (searchParams.sellerPage) sp.set("sellerPage", searchParams.sellerPage);
    } else {
      if (searchParams.page) sp.set("page", searchParams.page);
      if (value > 1) sp.set("sellerPage", String(value));
    }
    const q = sp.toString();
    return `/admin/analytics${q ? `?${q}` : ""}${key === "page" ? "#products" : "#sellers"}`;
  };

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

        <div id="report" className="flex-none scroll-mt-4">
          <Section
            title="Sales report"
            hint="Generate and read totals by day, month or year — or download the same selection as CSV."
          >
            <SalesReportPanel years={analytics.years} />
          </Section>
        </div>

        {/* Seller-wise sales */}
        <div id="sellers" className="flex-none scroll-mt-4">
          <Section
            title={`Sales by seller (${sellers.rows.length})`}
            hint="Revenue each seller has produced, with platform commission and payout."
          >
            <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
              {[
                ["Sellers", String(sellers.totals.sellers)],
                ["With sales", String(sellers.totals.sellingSellers)],
                ["Commission earned", inr(sellers.totals.commission)],
                ["Owed to sellers", inr(sellers.totals.payout)],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-4 py-3">
                  <p className="text-xs text-slate">{label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular">{value}</p>
                </div>
              ))}
            </div>

            {sellerRows.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate">
                Sellers appear here once their applications are approved.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 bg-white text-xs text-slate">
                      <tr>
                        <th className="px-4 py-3 font-medium">Seller</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Products</th>
                        <th className="px-4 py-3 text-right font-medium">Orders</th>
                        <th className="px-4 py-3 text-right font-medium">Units sold</th>
                        <th className="px-4 py-3 text-right font-medium">Revenue</th>
                        <th className="px-4 py-3 text-right font-medium">Commission</th>
                        <th className="px-4 py-3 text-right font-medium">Payout</th>
                        <th className="px-4 py-3 font-medium">Last order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {sellerRows.items.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3 font-medium">{s.seller}</td>
                          <td className="px-4 py-3 text-xs text-slate">
                            {s.status.replaceAll("_", " ").toLowerCase()}
                          </td>
                          <td className="px-4 py-3 text-right tabular">
                            {s.activeProducts}
                            <span className="text-slate">/{s.products}</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular">{s.orders}</td>
                          <td className="px-4 py-3 text-right tabular">{s.unitsSold}</td>
                          <td className="px-4 py-3 text-right font-medium tabular">{inr(s.revenue)}</td>
                          <td className="px-4 py-3 text-right tabular text-slate">
                            {inr(s.commission)}
                            <span className="ml-1 text-[11px]">({s.commissionPercent}%)</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular">{inr(s.payout)}</td>
                          <td className="px-4 py-3 text-xs text-slate">
                            {s.lastOrderAt ? fmtDate(s.lastOrderAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <Pagination
                  className="px-4 pb-4"
                  page={sellerRows.page}
                  pageCount={sellerRows.pageCount}
                  total={sellerRows.total}
                  pageSize={sellerRows.pageSize}
                  label="sellers"
                  hrefFor={(p) => hrefWith("sellerPage", p)}
                />
              </>
            )}
          </Section>
        </div>

        {/* Product performance */}
        <div id="products" className="flex-none scroll-mt-4">
          <Section
            title={`Product performance (${analytics.products.length})`}
            hint="Every product, ranked by revenue."
          >
            {products.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate">
                Products will appear here when sellers add listings.
              </p>
            ) : (
              <>
                <TableScroll>
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
                      {products.items.map((product) => (
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
                </TableScroll>
                <Pagination
                  className="px-4 pb-4"
                  page={products.page}
                  pageCount={products.pageCount}
                  total={products.total}
                  pageSize={products.pageSize}
                  label="products"
                  hrefFor={(p) => hrefWith("page", p)}
                />
              </>
            )}
          </Section>
        </div>
      </div>
    </OpsShell>
  );
}
