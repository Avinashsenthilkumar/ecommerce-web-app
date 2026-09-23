import Link from "next/link";
import clsx from "clsx";
import { LayoutDashboard, Store, Warehouse, Network, Truck, Package, Settings, ExternalLink } from "lucide-react";
import type { Role } from "@prisma/client";
import { getCurrentUser, ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { RefreshButton } from "./RefreshButton";

type Tab = { href: string; label: string };

const STAFF_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/hub", label: "Hub", icon: Network },
  { href: "/courier", label: "Courier", icon: Truck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Work waiting in each console, shown as badges in the sidebar. */
async function navCounts(role: Role) {
  if (role === "VENDOR" || role === "CUSTOMER") return {} as Record<string, number>;
  const [orders, sellers, listings, floor, network, runsheet, pickups] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["PLACED", "CONFIRMED"] } } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.shipment.count({ where: { status: { in: ["ALLOCATED", "PICKED", "PACKED", "LABELLED"] } } }),
    prisma.shipment.count({ where: { status: { in: ["IN_TRANSIT", "AT_HUB"] } } }),
    prisma.shipment.count({ where: { status: "OUT_FOR_DELIVERY" } }),
    prisma.return.count({ where: { status: { in: ["PICKUP_SCHEDULED", "PICKED_UP"] } } }),
  ]);
  return {
    "/admin": orders,
    "/admin/sellers": sellers + listings,
    "/warehouse": floor,
    "/hub": network,
    "/courier": runsheet + pickups,
  } as Record<string, number>;
}

/**
 * Operations layout: fixed left sidebar + full-width work area.
 * On large screens (xl) the page never scrolls; each panel scrolls inside itself,
 * so a manager sees every section at once.
 */
export async function OpsShell({
  title,
  subtitle,
  tabs,
  active,
  children,
}: {
  title: string;
  subtitle: string;
  tabs: Tab[];
  active: string;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const role = user?.role ?? "CUSTOMER";
  const nav =
    role === "VENDOR"
      ? tabs.map((t) => ({ ...t, icon: Package }))
      : STAFF_NAV.filter((n) => role === "ADMIN" || n.href === ROLE_HOME[role]);
  const counts = await navCounts(role);
  const loginPath = role === "VENDOR" ? "/vendor/login" : "/staff/login";
  const initials = (user?.fullName ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="border-b border-line bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-14 items-center px-5 lg:h-16">
          <Logo href={ROLE_HOME[role]} />
        </div>
        <p className="hidden px-5 pb-2 pt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-slate lg:block">
          {role === "VENDOR" ? "Seller" : "Operations"}
        </p>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Consoles">
          {nav.map((n) => {
            const on = active === n.href;
            const count = counts[n.href] ?? 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={clsx(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  on ? "bg-ink text-white" : "text-slate hover:bg-mist hover:text-ink",
                )}
              >
                <n.icon size={17} strokeWidth={1.8} />
                <span className="flex-1">{n.label}</span>
                {count > 0 && (
                  <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular", on ? "bg-white text-ink" : "bg-amberSoft text-amber")}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="hidden border-t border-line p-4 lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-xs font-semibold">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.fullName}</p>
                <p className="text-xs text-slate">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-1 text-xs text-slate hover:text-ink">
                Storefront <ExternalLink size={12} />
              </Link>
              <SignOutButton className="btn-outline btn-sm" redirectTo={loginPath} />
            </div>
          </div>
        )}
      </aside>

      {/* Work area */}
      <div className="flex min-h-screen flex-col lg:pl-60 xl:h-screen xl:overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-5 lg:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
            <p className="truncate text-xs text-slate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <span className="lg:hidden">{user && <SignOutButton className="btn-outline btn-sm" redirectTo={loginPath} />}</span>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-5 xl:min-h-0">{children}</main>
      </div>
    </div>
  );
}

/** Row of compact KPI tiles. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4">{children}</div>;
}

export function StatCard({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone?: "warn" | "pine" }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <p className="text-xs text-slate">{label}</p>
      <p className={clsx("mt-1 text-2xl font-semibold tracking-tight tabular", tone === "warn" && "text-amber", tone === "pine" && "text-pine")}>{value}</p>
      <p className="text-[11px] text-slate">{hint}</p>
    </div>
  );
}

/** Grid that fills the remaining screen height on xl; its panels scroll internally. */
export function Board({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("grid gap-4 xl:min-h-0 xl:flex-1", className)}>{children}</div>;
}

export function Section({
  title,
  hint,
  action,
  className,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-white", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint && <p className="truncate text-xs text-slate">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-slate">{children}</p>;
}
