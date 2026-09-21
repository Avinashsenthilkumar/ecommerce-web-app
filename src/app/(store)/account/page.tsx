import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, MapPin, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listAddresses } from "@/lib/services/account";
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";
import { AddressBook } from "@/components/account/AddressBook";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = { title: "Your account — subsel" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login?next=/account");
  const [addresses, orderCount, wishCount] = await Promise.all([
    listAddresses(user.id),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
  ]);

  const tiles = [
    { href: "/orders", icon: Package, title: "Your orders", text: `${orderCount} order(s). Track, return or cancel.` },
    { href: "/wishlist", icon: Heart, title: "Your wishlist", text: `${wishCount} saved item(s).` },
    { href: "#addresses", icon: MapPin, title: "Your addresses", text: `${addresses.length} saved for faster checkout.` },
  ];

  return (
    <div className="shell max-w-5xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-5xl">Your account</h1>
          <p className="mt-2 text-sm text-slate">
            {user.fullName}, {user.email}
            {user.phone ? `, ${user.phone}` : ""}. Customer since {fmtDate(user.createdAt)}.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="panel flex gap-4 p-5 transition-colors hover:border-ink/30">
            <t.icon size={22} className="shrink-0 text-pine" />
            <span>
              <span className="block font-bold">{t.title}</span>
              <span className="text-sm text-slate">{t.text}</span>
            </span>
          </Link>
        ))}
      </div>

      <section id="addresses" className="mt-12 scroll-mt-32">
        <h2 className="text-xl font-bold">Your addresses</h2>
        <div className="mt-4">
          <AddressBook
            addresses={addresses.map((a) => ({
              id: a.id,
              name: a.name,
              phone: a.phone,
              line1: a.line1,
              line2: a.line2 ?? "",
              city: a.city,
              state: a.state,
              pincode: a.pincode,
              isDefault: a.isDefault,
            }))}
            defaultName={user.fullName}
            defaultPhone={user.phone ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
