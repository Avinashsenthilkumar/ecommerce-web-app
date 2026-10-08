import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";
import { getNavigationItems, getSettings } from "@/lib/settings";
import { cartCount } from "@/lib/services/cart";
import { Logo } from "./Logo";
import { AccountMenu } from "./AccountMenu";
import { HeaderSearch } from "./HeaderSearch";
import { MobileNav } from "./MobileNav";

export async function Header() {
  const [user, s] = await Promise.all([getCurrentUser(), getSettings()]);
  const navItems = getNavigationItems(s).filter((item) => item.visible);
  const isCustomer = user?.role === "CUSTOMER";
  const count = user && isCustomer ? await cartCount(user.id) : 0;
  const accountUser = user
    ? {
        firstName: user.fullName.split(" ")[0],
        isCustomer,
        consoleHref: isCustomer ? null : ROLE_HOME[user.role],
      }
    : null;

  return (
    // `relative` anchors the search panel to the whole header, so it drops below
    // the department row instead of covering it.
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      {s["announcement.enabled"] === "1" && s["announcement.text"] && (
        <p className="bg-ink px-4 py-2 text-center text-xs text-white">{s["announcement.text"]}</p>
      )}

      <div className="relative">
        <div className="shell flex h-16 items-center gap-3 sm:gap-4">
          <MobileNav
            items={navItems.map((item) => ({ href: item.href, label: item.label }))}
            user={accountUser}
            bagCount={count}
            storeName={s["brand.name"]}
          />

          <Logo />

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-4 xl:gap-7 lg:flex"
            aria-label="Departments"
          >
            {navItems.map((item, index) => (
              <Link
                key={`${item.href}-${index}`}
                href={item.href}
                className={
                  item.style === "pill"
                    ? "whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-sm text-ink hover:border-ink/40"
                    : "whitespace-nowrap text-sm text-slate transition-colors hover:text-ink"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <HeaderSearch />
            <div className="hidden lg:block">
              <AccountMenu user={accountUser} />
            </div>
            <Link href="/wishlist" className="icon-btn hidden lg:inline-flex" aria-label="Wishlist">
              <Heart size={16} />
            </Link>
            <Link
              href="/cart"
              className="icon-btn hidden border-ink bg-ink text-white hover:bg-ink/85 lg:inline-flex"
              aria-label={`Bag, ${count} items`}
            >
              <ShoppingBag size={16} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-paper bg-white px-1 text-[10px] font-semibold text-ink tabular">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Department chips on phones: the drawer holds the full list, this row
            is the quick path. The right-hand fade shows it keeps scrolling. */}
        <div className="relative lg:hidden">
          <nav
            className="shell flex gap-5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Departments"
          >
            {navItems.map((item, index) => (
              <Link
                key={`${item.href}-${index}`}
                href={item.href}
                className="whitespace-nowrap text-sm text-slate hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <span aria-hidden className="w-6 shrink-0" />
          </nav>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-paper to-transparent"
          />
        </div>
      </div>
    </header>
  );
}
