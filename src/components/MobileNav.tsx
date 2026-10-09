"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
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

export type NavLink = { href: string; label: string };

/**
 * Phone navigation: a hamburger that opens an off-canvas drawer with every
 * department and account link, so nothing depends on noticing a sideways scroll.
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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const accountLinks = user?.isCustomer
    ? [
        { href: "/account", label: "Your account", icon: User },
        { href: "/orders", label: "Your orders", icon: Package },
        { href: "/wishlist", label: "Wishlist", icon: Heart },
        { href: "/cart", label: `Bag${bagCount ? ` (${bagCount})` : ""}`, icon: ShoppingBag },
      ]
    : user
      ? [
          ...(user.consoleHref
            ? [{ href: user.consoleHref, label: "Your console", icon: Store }]
            : []),
          { href: "/", label: "Storefront", icon: Store },
        ]
      : [
          { href: "/login", label: "Sign in", icon: LogIn },
          { href: "/register", label: "Create account", icon: User },
          { href: "/wishlist", label: "Wishlist", icon: Heart },
          { href: "/cart", label: `Bag${bagCount ? ` (${bagCount})` : ""}`, icon: ShoppingBag },
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
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-ink/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
              <div>
                <p className="text-base font-semibold">{storeName}</p>
                <p className="text-xs text-slate">
                  {user ? `Hello, ${user.firstName}` : "Welcome — sign in for faster checkout"}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="icon-btn" aria-label="Close menu">
                <X size={16} />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <form action="/shop" role="search" className="flex gap-2 border-b border-line px-5 py-4">
                <input type="hidden" name="category" value="all" />
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate"
                    aria-hidden
                  />
                  <input
                    name="q"
                    placeholder="Search products"
                    aria-label="Search products"
                    className="input h-11 pl-10"
                  />
                </div>
                <button className="btn-primary btn-sm h-11 px-4">Go</button>
              </form>

              <nav aria-label="Departments" className="px-3 py-3">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
                  Shop by department
                </p>
                <ul>
                  {items.map((item, i) => (
                    <li key={`${item.href}-${i}`}>
                      <Link
                        href={item.href}
                        aria-current={currentUrl === item.href ? "page" : undefined}
                        className={clsx(
                          "flex items-center justify-between rounded-xl px-3 py-3 text-[15px] hover:bg-mist",
                          currentUrl === item.href && "bg-mist font-medium",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label="Account" className="border-t border-line px-3 py-3">
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate">
                  Your account
                </p>
                <ul>
                  {accountLinks.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] hover:bg-mist"
                      >
                        <link.icon size={17} className="shrink-0 text-slate" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-line px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Link href="/vendor/login" className="text-xs text-slate hover:text-ink">
                  Sell on {storeName}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
