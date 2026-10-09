import Link from "next/link";
import { Logo } from "./Logo";
import { getSettings } from "@/lib/settings";

const linksFor = (storeName: string): [string, string][] => [
  ["Shop", "/shop?category=all"],
  ["My orders", "/orders"],
  ["Wishlist", "/wishlist"],
  ["Your account", "/account"],
  [`Sell on ${storeName}`, "/vendor/login"],
  ["Staff login", "/staff/login"],
];

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="shell flex flex-wrap items-start justify-between gap-8 py-12">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-slate">{s["brand.tagline"]}</p>
          <p className="text-sm text-slate">
            {s["contact.email"]}
            {s["contact.phone"] ? ` · ${s["contact.phone"]}` : ""}
            {s["contact.address"] ? <><br />{s["contact.address"]}</> : null}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3" aria-label="Footer">
          {linksFor(s["brand.name"]).map(([label, href]) => (
            <Link key={label} href={href} className="text-sm text-slate hover:text-ink">{label}</Link>
          ))}
        </nav>
      </div>
      <div className="shell flex flex-wrap justify-between gap-3 border-t border-line py-5 text-xs text-slate">
        <p>© {new Date().getFullYear()} {s["brand.name"]}</p>
        <p>{s["footer.note"]}</p>
      </div>
    </footer>
  );
}
