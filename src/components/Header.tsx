import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";
import { cartCount } from "@/lib/services/cart";
import { Logo } from "./Logo";
import { AccountMenu } from "./AccountMenu";
import { HeaderSearch } from "./HeaderSearch";

const NAV = [
  { slug: "men", label: "Men" },
  { slug: "women", label: "Women" },
  { slug: "children", label: "Children" },
  { slug: "electronics", label: "Electronics" },
  { slug: "accessories", label: "Accessories" },
  { slug: "home", label: "Home" },
];

export async function Header() {
  const user = await getCurrentUser();
  const isCustomer = user?.role === "CUSTOMER";
  const count = user && isCustomer ? await cartCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="shell relative flex h-16 items-center gap-6">
        <Logo />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex" aria-label="Departments">
          {NAV.map((n) => (
            <Link key={n.slug} href={`/shop?category=${n.slug}`} className="text-sm text-slate transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
          <Link href="/shop?category=all" className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink hover:border-ink/40">
            All products
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch />
          <AccountMenu
            user={user ? { firstName: user.fullName.split(" ")[0], isCustomer, consoleHref: isCustomer ? null : ROLE_HOME[user.role] } : null}
          />
          <Link href="/wishlist" className="icon-btn" aria-label="Wishlist">
            <Heart size={16} />
          </Link>
          <Link href="/cart" className="icon-btn border-ink bg-ink text-white hover:bg-ink/85" aria-label={`Bag, ${count} items`}>
            <ShoppingBag size={16} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-paper bg-white px-1 text-[10px] font-semibold text-ink tabular">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav className="shell flex gap-5 overflow-x-auto pb-3 lg:hidden" aria-label="Departments">
        {[...NAV, { slug: "all", label: "All products" }].map((n) => (
          <Link key={n.slug} href={`/shop?category=${n.slug}`} className="whitespace-nowrap text-sm text-slate hover:text-ink">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
