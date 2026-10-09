"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  ChevronRight,
  Heart,
  LogIn,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Store,
  User,
  X,
} from "lucide-react";
import { Portal } from "./Portal";
import { LogoMark } from "./LogoMark";
import { useScrollLock } from "@/lib/useScrollLock";

export type NavLink = { href: string; label: string };

/**
 * Phone navigation: a hamburger that opens an off-canvas drawer holding every
 * department and account link, so nothing depends on noticing a sideways scroll.
 *
 * Laid out the way a native app's side menu is: who you are at the top, search,
 * then departments, then the four places people actually go, then the seller
 * link pinned at the bottom. Every row is a 48px+ target.
 */
export function MobileNav({
  items,
  user,
  bagCount,
  storeName,
}: {
  items: NavLink[];
  user: { firstName: string; isCustomer: boolean; consoleHref: string | null } | null;
  bagCount: number;
  storeName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Read the query after mount rather than with useSearchParams: this component
  // renders in the header on every page, and useSearchParams would force a
  // Suspense boundary around every statically rendered page.
  const [currentUrl, setCurrentUrl] = useState(pathname);
  useEffect(() => {
    setCurrentUrl(window.location.pathname + window.location.search);
  }, [pathname]);

  // Close when navigating to a new page.
  useEffect(() => setOpen(false), [currentUrl]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  useScrollLock(open);

  const shortcuts = user?.isCustomer
    ? [
        { href: "/orders", label: "Orders", icon: Package },
        { href: "/wishlist", label: "Wishlist", icon: Heart },
        { href: "/cart", label: "Bag", icon: ShoppingBag, badge: bagCount },
        { href: "/account", label: "Account", icon: User },
      ]
    : [
        { href: "/wishlist", label: "Wishlist", icon: Heart },
        { href: "/cart", label: "Bag", icon: ShoppingBag, badge: bagCount },
      ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-btn lg:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu size={17} />
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-x-0 top-0 z-[60] h-[100dvh] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full bg-ink/45 backdrop-blur-[2px] motion-safe:animate-[fade-in_.2s_ease-out]"
            />

            <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-[22rem] flex-col overflow-hidden rounded-r-[26px] bg-paper shadow-[0_0_60px_rgba(0,0,0,0.3)] motion-safe:animate-[drawer-in_.24s_ease-out]">
              {/* Identity */}
              <div className="shrink-0 bg-white px-5 pb-5 pt-[calc(1.1rem+env(safe-area-inset-top))]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper">
                      {user ? (
                        <span className="text-base font-semibold uppercase">
                          {user.firstName.slice(0, 1)}
                        </span>
                      ) : (
                        <LogoMark size={24} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold leading-tight">
                        {user ? `Hello, ${user.firstName}` : storeName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate">
                        {user ? storeName : "Sign in for faster checkout"}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="icon-btn shrink-0"
                    aria-label="Close menu"
                  >
                    <X size={16} />
                  </button>
                </div>

                {!user && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="btn-primary btn-sm h-11 justify-center"
                    >
                      <LogIn size={15} /> Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="btn-outline btn-sm h-11 justify-center"
                    >
                      Register
                    </Link>
                  </div>
                )}

                {user && !user.isCustomer && user.consoleHref && (
                  <Link
                    href={user.consoleHref}
                    onClick={() => setOpen(false)}
                    className="btn-outline btn-sm mt-4 h-11 w-full justify-center"
                  >
                    <Store size={15} /> Open your console
                  </Link>
                )}
              </div>

              {/* Scrolling body */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) setOpen(false);
                }}
              >
                <form action="/shop" role="search" className="bg-white px-5 pb-5">
                  <input type="hidden" name="category" value="all" />
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate"
                      aria-hidden
                    />
                    <input
                      name="q"
                      placeholder="Search products"
                      aria-label="Search products, brands or SKU"
                      className="input h-12 bg-paper pl-11 pr-16"
                    />
                    <button className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-full bg-ink px-4 text-xs font-medium text-white">
                      Go
                    </button>
                  </div>
                </form>

                {shortcuts.length > 0 && (
                  <nav aria-label="Shortcuts" className="border-y border-line bg-white px-3 py-3">
                    <ul
                      className={clsx(
                        "grid gap-2",
                        shortcuts.length === 2 ? "grid-cols-2" : "grid-cols-4",
                      )}
                    >
                      {shortcuts.map((s) => (
                        <li key={s.href}>
                          <Link
                            href={s.href}
                            className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] text-slate active:bg-mist"
                          >
                            <span className="relative">
                              <s.icon size={19} className="text-ink" />
                              {!!s.badge && (
                                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-semibold text-white tabular">
                                  {s.badge}
                                </span>
                              )}
                            </span>
                            {s.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}

                <nav aria-label="Departments" className="px-3 py-4">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                    Shop by department
                  </p>
                  <ul className="divide-y divide-line/70">
                    {items.map((item, i) => {
                      const active = currentUrl === item.href;
                      return (
                        <li key={`${item.href}-${i}`}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={clsx(
                              "flex min-h-[52px] items-center justify-between gap-3 rounded-xl px-3 text-[15px] active:bg-mist",
                              active && "font-semibold",
                            )}
                          >
                            <span className="min-w-0 truncate">{item.label}</span>
                            <ChevronRight
                              size={17}
                              className={active ? "shrink-0 text-ink" : "shrink-0 text-slate/60"}
                              aria-hidden
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {user?.isCustomer && (
                  <nav aria-label="Account" className="border-t border-line px-3 py-4">
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                      Your account
                    </p>
                    <ul className="divide-y divide-line/70">
                      {[
                        { href: "/account", label: "Account details", icon: User },
                        { href: "/orders", label: "Orders & tracking", icon: Package },
                      ].map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-[15px] active:bg-mist"
                          >
                            <link.icon size={17} className="shrink-0 text-slate" />
                            <span className="min-w-0 flex-1 truncate">{link.label}</span>
                            <ChevronRight size={17} className="shrink-0 text-slate/60" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </div>

              {/* Pinned footer */}
              <div className="shrink-0 border-t border-line bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Link
                  href="/vendor/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-xs text-slate active:text-ink"
                >
                  <Store size={14} /> Sell on {storeName}
                </Link>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
