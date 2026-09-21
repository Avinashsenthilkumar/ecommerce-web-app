import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { listCategories, listProducts } from "@/lib/services/catalog";
import { getWishlistIds } from "@/lib/services/wishlist";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";

const STATS = [
  ["99.4%", "Pick accuracy"],
  ["3.2 h", "Avg. dispatch"],
  ["100%", "Hub legs scanned"],
  ["7 days", "Return window"],
];

export default async function HomePage() {
  const [categories, arrivals, selected, saved] = await Promise.all([
    listCategories(),
    listProducts({ newArrival: true, sort: "featured", take: 4 }),
    listProducts({ featured: true, sort: "rating", take: 4 }),
    getWishlistIds(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="shell pt-4">
        <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-line bg-mist lg:min-h-[700px]">
          <ProductImage src="/products/hero.jpg" alt="Model in a linen jacket against a sunlit plaster wall" className="absolute inset-0 h-full w-full object-[70%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F3EEE7]/85 via-[#F3EEE7]/35 to-transparent md:from-[#F3EEE7]/60 md:via-transparent" aria-hidden />
          <div className="relative flex min-h-[560px] max-w-[34rem] flex-col justify-center px-7 py-16 sm:px-12 lg:min-h-[700px]">
            <p className="eyebrow">Autumn edit — 2026</p>
            <h1 className="h-display mt-6 text-[3.4rem] leading-[0.95] sm:text-[4.6rem] lg:text-[5.2rem]">
              Considered goods, delivered precisely.
            </h1>
            <p className="mt-7 max-w-[26rem] text-[15px] leading-relaxed text-ink/70">
              Apparel, electronics, accessories and home objects — picked, packed and tracked through our own fulfilment network.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop?category=all" className="btn-primary">
                Shop Now <ArrowUpRight size={15} />
              </Link>
              <Link href="/shop?category=women" className="btn-outline">Explore Collection</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="shell pt-24">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Categories</p>
            <h2 className="section-title mt-4 max-w-md">Six departments, one checkout.</h2>
          </div>
          <Link href="/shop?category=all" className="btn-outline shrink-0">
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className={clsx("group relative block h-[420px] overflow-hidden rounded-card border border-line bg-mist md:h-[520px]", i === 0 && "md:col-span-2")}
            >
              <ProductImage src={c.imageUrl} alt={c.name} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-[20px] bg-white/95 px-4 py-3.5 backdrop-blur">
                <span>
                  <span className="block text-[15px]">{c.name}</span>
                  <span className="block text-xs text-slate">{c.tagline}</span>
                </span>
                <ArrowUpRight size={16} className="shrink-0" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Catalogs */}
      <section className="shell pt-24">
        <p className="eyebrow">Catalogs</p>
        <h2 className="section-title mb-10 mt-4 max-w-xl">Fresh arrivals and new selections.</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {arrivals.map((p) => (
            <ProductCard key={p.id} p={p} saved={saved.has(p.id)} />
          ))}
        </div>
      </section>

      {/* Fulfilment */}
      <section className="shell pt-24">
        <div className="grid items-center gap-12 rounded-[32px] border border-line bg-mist px-7 py-14 sm:px-16 sm:py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Fulfilment</p>
            <h2 className="section-title mt-4 max-w-lg">Every parcel is scanned, not guessed.</h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink/70">
              Orders split automatically across our Chennai and Thanjavur fulfilment centres. Each package carries a unique QR that is verified at pick, pack,
              hub intake and handover.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/orders" className="btn-primary">Track an order</Link>
              <Link href="/admin" className="btn-outline">See operations</Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {STATS.map(([value, label]) => (
              <div key={label} className="rounded-[24px] border border-line bg-white px-5 py-6">
                <dd className="font-display text-[1.75rem] font-medium tracking-[-0.02em] tabular">{value}</dd>
                <dt className="mt-1 text-xs text-slate">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Selected */}
      <section className="shell pt-24">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 className="section-title">Selected for the week</h2>
          <Link href="/shop?category=all" className="btn-outline shrink-0">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {selected.map((p) => (
            <ProductCard key={p.id} p={p} saved={saved.has(p.id)} />
          ))}
        </div>
      </section>
    </>
  );
}
