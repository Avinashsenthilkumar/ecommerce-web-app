import Link from "next/link";
import { Logo } from "./Logo";

const LINKS: [string, string][] = [
  ["Shop", "/shop?category=all"],
  ["My orders", "/orders"],
  ["Wishlist", "/wishlist"],
  ["Your account", "/account"],
  ["Sell on subsel", "/vendor/login"],
  ["Staff login", "/staff/login"],
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="shell flex flex-wrap items-start justify-between gap-8 py-12">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-slate">
            A connected commerce platform — storefront, fulfilment, hub network and last mile in one operating system.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3" aria-label="Footer">
          {LINKS.map(([label, href]) => (
            <Link key={label} href={href} className="text-sm text-slate hover:text-ink">{label}</Link>
          ))}
        </nav>
      </div>
      <div className="shell flex flex-wrap justify-between gap-3 border-t border-line py-5 text-xs text-slate">
        <p>© {new Date().getFullYear()} subsel</p>
        <p>UPI, cards, netbanking and cash on delivery</p>
      </div>
    </footer>
  );
}
