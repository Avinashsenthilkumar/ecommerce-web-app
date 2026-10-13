"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingBag, User } from "lucide-react";
import clsx from "clsx";

/** App-style bottom navigation on phones (hidden on desktop). */
export function MobileTabBar({ bagCount }: { bagCount: number }) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Home", icon: Home, active: path === "/" },
    { href: "/shop?category=all", label: "Categories", icon: LayoutGrid, active: path.startsWith("/shop") || path.startsWith("/product") },
    { href: "/wishlist", label: "Wishlist", icon: Heart, active: path.startsWith("/wishlist") },
    { href: "/cart", label: "Bag", icon: ShoppingBag, active: path.startsWith("/cart"), badge: bagCount },
    { href: "/account", label: "Account", icon: User, active: path.startsWith("/account") || path.startsWith("/orders") },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="App navigation"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={clsx(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors active:bg-mist",
                t.active ? "text-ink" : "text-slate",
              )}
            >
              <span className="relative">
                <t.icon size={21} strokeWidth={t.active ? 2.2 : 1.7} />
                {!!t.badge && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-semibold text-white tabular">
                    {t.badge}
                  </span>
                )}
              </span>
              {t.label}
              {t.active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
