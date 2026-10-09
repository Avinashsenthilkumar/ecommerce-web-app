import { staffGate } from "@/lib/auth";
import { getSellerAdmin } from "@/lib/services/sellers";
import { fmtDate, inr } from "@/lib/format";
import { AccessGate } from "@/components/AccessGate";
import { Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { Pagination } from "@/components/Pagination";
import { paginate, pageFromParam } from "@/lib/paginate";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { ReasonAction } from "@/components/ReasonAction";
import { ProductImage } from "@/components/ProductImage";
import { TableScroll } from "@/components/TableScroll";

export const metadata = { title: "Sellers & listings — subsel admin" };

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/warehouse", label: "Warehouse" },
  { href: "/hub", label: "Hub" },
  { href: "/courier", label: "Courier" },
];

const ROWS = 10;

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: { appPage?: string; listPage?: string; sellerPage?: string };
}) {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;
  const { applications, sellers, listings } = await getSellerAdmin();

  const appPage = paginate(applications, pageFromParam(searchParams.appPage), ROWS);
  const listPage = paginate(listings, pageFromParam(searchParams.listPage), ROWS);
  const sellerPage = paginate(sellers, pageFromParam(searchParams.sellerPage), ROWS);
  const pageHref = (key: "appPage" | "listPage" | "sellerPage", value: number) => {
    const sp = new URLSearchParams();
    for (const k of ["appPage", "listPage", "sellerPage"] as const) {
      if (k === key) {
        if (value > 1) sp.set(k, String(value));
      } else if (searchParams[k]) sp.set(k, searchParams[k]!);
    }
    const q = sp.toString();
    const anchor =
      key === "appPage" ? "#applications" : key === "listPage" ? "#listings" : "#all-sellers";
    return `/admin/sellers${q ? `?${q}` : ""}${anchor}`;
  };
  const approved = sellers.filter((s) => s.status === "APPROVED").length;
  const suspended = sellers.filter((s) => s.status === "SUSPENDED").length;

  return (
    <OpsShell title="Sellers & listings" subtitle="Approve sellers and review products before they go live" tabs={TABS} active="/admin/sellers">
      <StatRow>
        <StatCard label="Applications" value={applications.length} hint="Waiting for approval" tone={applications.length ? "warn" : undefined} />
        <StatCard label="Listings to review" value={listings.length} hint="Submitted by sellers" tone={listings.length ? "warn" : undefined} />
        <StatCard label="Active sellers" value={approved} hint="Can list and sell" tone="pine" />
        <StatCard label="Suspended" value={suspended} hint="Listings hidden" />
      </StatRow>

      <div className="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
      <div id="applications" className="contents">
      <Section title="Seller applications" hint="Check the business details, then approve or reject with a reason">
        {applications.length === 0 ? (
          <Empty>No pending applications.</Empty>
        ) : (
          <>
          <ul className="divide-y divide-line">
            {appPage.items.map((v) => (
              <li key={v.id} className="grid gap-4 px-5 py-5 2xl:grid-cols-[1.4fr_1fr]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-medium">{v.businessName}</p>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="text-sm text-slate">{v.user.fullName}, {v.user.email}{v.user.phone ? `, ${v.user.phone}` : ""}</p>
                  <p className="text-sm"><span className="text-slate">GSTIN:</span> <span className="tabular">{v.gstin ?? "Not provided"}</span></p>
                  {v.pickupAddress && <p className="text-sm"><span className="text-slate">Pickup:</span> {v.pickupAddress}</p>}
                  {v.storeDescription && <p className="text-sm"><span className="text-slate">Sells:</span> {v.storeDescription}</p>}
                  <p className="text-xs text-slate">Applied {fmtDate(v.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2 2xl:justify-end">
                  <ActionButton url={`/api/admin/sellers/${v.id}`} body={{ action: "approve" }} label="Approve seller" variant="pine" />
                  <ReasonAction url={`/api/admin/sellers/${v.id}`} action="reject" label="Reject" placeholder="Reason, e.g. GSTIN could not be verified" />
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            className="px-5 pb-5"
            page={appPage.page}
            pageCount={appPage.pageCount}
            total={appPage.total}
            pageSize={appPage.pageSize}
            label="applications"
            hrefFor={(p) => pageHref("appPage", p)}
          />
          </>
        )}
      </Section>
      </div>

      <div id="listings" className="contents">
      <Section title="Listings awaiting review" hint="New products stay hidden from customers until you approve them">
        {listings.length === 0 ? (
          <Empty>No listings waiting.</Empty>
        ) : (
          <>
          <ul className="divide-y divide-line">
            {listPage.items.map((p) => (
              <li key={p.id} className="grid gap-4 px-5 py-5 2xl:grid-cols-[1.4fr_1fr]">
                <div className="flex gap-4">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-mist">
                    <ProductImage src={p.images[0]?.url} alt={p.name} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="eyebrow">{p.brand.name}</p>
                    <p className="text-base font-medium">{p.name}</p>
                    <p className="text-sm text-slate">{p.vendor.businessName}, {p.category.name}, {inr(p.sellingPrice)} (MRP {inr(p.mrp)})</p>
                    <p className="text-sm text-slate">{p.shortDescription}</p>
                    <p className="text-xs text-slate tabular">
                      {p.variants.map((v) => `${v.sku}: ${v.inventory.reduce((a, i) => a + i.available, 0)} units`).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2 2xl:justify-end">
                  <ActionButton url={`/api/admin/listings/${p.id}`} body={{ action: "approve" }} label="Approve & publish" variant="pine" />
                  <ReasonAction url={`/api/admin/listings/${p.id}`} action="reject" label="Send back" placeholder="What should the seller fix?" variant="outline" />
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            className="px-5 pb-5"
            page={listPage.page}
            pageCount={listPage.pageCount}
            total={listPage.total}
            pageSize={listPage.pageSize}
            label="listings"
            hrefFor={(page) => pageHref("listPage", page)}
          />
          </>
        )}
      </Section>
      </div>

      <div id="all-sellers" className="contents">
      <Section title="All sellers" className="xl:col-span-2">
        {sellers.length === 0 ? (
          <Empty>No sellers yet.</Empty>
        ) : (
          <>
          <TableScroll>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-slate">
                  <th className="px-5 py-3 font-medium">Seller</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Products</th>
                  <th className="px-3 py-3 font-medium">Commission</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sellerPage.items.map((v) => (
                  <tr key={v.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium">{v.businessName}</p>
                      <p className="text-xs text-slate tabular">{v.gstin ?? "No GSTIN"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate">{v.user.fullName}<br />{v.user.email}</td>
                    <td className="px-3 py-3 tabular">{v._count.products}</td>
                    <td className="px-3 py-3 tabular">{v.commissionPercent}%</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={v.status} />
                      {v.rejectionReason && v.status !== "APPROVED" && <p className="mt-1 max-w-[14rem] text-xs text-slate">{v.rejectionReason}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {v.status === "APPROVED" && <ReasonAction url={`/api/admin/sellers/${v.id}`} action="suspend" label="Suspend" placeholder="Reason for suspension" />}
                        {v.status === "SUSPENDED" && <ActionButton url={`/api/admin/sellers/${v.id}`} body={{ action: "reinstate" }} label="Reinstate" variant="pine" />}
                        {v.status === "REJECTED" && <ActionButton url={`/api/admin/sellers/${v.id}`} body={{ action: "approve" }} label="Approve now" variant="outline" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <Pagination
            className="px-5 pb-5"
            page={sellerPage.page}
            pageCount={sellerPage.pageCount}
            total={sellerPage.total}
            pageSize={sellerPage.pageSize}
            label="sellers"
            hrefFor={(page) => pageHref("sellerPage", page)}
          />
          </>
        )}
      </Section>
      </div>
      </div>
    </OpsShell>
  );
}
