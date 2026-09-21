import Link from "next/link";
import clsx from "clsx";
import { listCategories, listProducts, SORT_OPTIONS, type SortKey } from "@/lib/services/catalog";
import { getWishlistIds } from "@/lib/services/wishlist";
import { ProductCard } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";

export const metadata = { title: "Shop — subsel" };

export default async function ShopPage({ searchParams }: { searchParams: { category?: string; q?: string; sort?: string } }) {
  const category = searchParams.category ?? "all";
  const sort = (SORT_OPTIONS.some((o) => o.key === searchParams.sort) ? searchParams.sort : "featured") as SortKey;
  const q = searchParams.q?.trim() || undefined;

  const [categories, products, saved] = await Promise.all([listCategories(), listProducts({ category, q, sort }), getWishlistIds()]);
  const current = categories.find((c) => c.slug === category);

  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries({ category, sort, q, ...params }).forEach(([k, v]) => v && sp.set(k, v));
    return `/shop?${sp.toString()}`;
  };

  return (
    <div className="shell pt-12">
      <p className="eyebrow">Catalogue</p>
      <h1 className="h-display mt-4 text-[3rem] leading-none sm:text-[3.5rem]">{q ? `“${q}”` : current?.name ?? "All products"}</h1>
      <p className="mt-4 text-[15px] text-slate">{q ? `Search results in ${current?.name ?? "all departments"}` : current?.tagline ?? "Every department in one place"}</p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Categories">
        {[{ slug: "all", name: "All" }, ...categories].map((c) => (
          <Link
            key={c.slug}
            href={href({ category: c.slug })}
            aria-current={category === c.slug ? "page" : undefined}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              category === c.slug ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/40",
            )}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action="/shop" className="w-full max-w-xs" role="search">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="sort" value={sort} />
          <input name="q" defaultValue={q} placeholder="Search products or brands" className="input" aria-label="Search products or brands" />
        </form>
        <SortSelect value={sort} options={SORT_OPTIONS} />
        <p className="text-sm text-slate">{products.length} items</p>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-lg">No products match {q ? `“${q}”` : "this department"} yet.</p>
          <Link href="/shop?category=all" className="btn-outline mt-6">Browse all products</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} saved={saved.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
