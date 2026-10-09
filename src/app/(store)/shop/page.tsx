import Link from "next/link";
import clsx from "clsx";
import { Search, X } from "lucide-react";
import {
  getProductFacets,
  listCategories,
  listProductsPage,
  PAGE_SIZE,
  SORT_OPTIONS,
  type SortKey,
} from "@/lib/services/catalog";
import { getWishlistIds } from "@/lib/services/wishlist";
import { pageFromParam } from "@/lib/paginate";
import { ProductCard } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { Pagination } from "@/components/Pagination";
import { ShopFilters } from "@/components/shop/ShopFilters";

export const metadata = { title: "Shop — subsel" };

type Params = {
  category?: string;
  q?: string;
  sort?: string;
  brand?: string | string[];
  min?: string;
  max?: string;
  rating?: string;
  instock?: string;
  page?: string;
};

/** Digits only; an empty or junk value means "no limit", not zero. */
const positiveInt = (value?: string) => {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  return Number(value.trim());
};

export default async function ShopPage({ searchParams }: { searchParams: Params }) {
  const category = searchParams.category ?? "all";
  const sort = (SORT_OPTIONS.some((o) => o.key === searchParams.sort)
    ? searchParams.sort
    : "featured") as SortKey;
  const q = searchParams.q?.trim() || undefined;

  const brands = (
    Array.isArray(searchParams.brand)
      ? searchParams.brand
      : searchParams.brand
        ? [searchParams.brand]
        : []
  ).filter(Boolean);
  let minPrice = positiveInt(searchParams.min);
  let maxPrice = positiveInt(searchParams.max);
  // Tolerate a reversed range instead of returning nothing.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const minRating = [2, 3, 4].includes(Number(searchParams.rating))
    ? Number(searchParams.rating)
    : undefined;
  const inStock = searchParams.instock === "1";

  const filters = { category, q, sort, brands, minPrice, maxPrice, minRating, inStock };
  const requestedPage = pageFromParam(searchParams.page);

  const [categories, facets, result, saved] = await Promise.all([
    listCategories(),
    getProductFacets({ category, q }),
    listProductsPage(filters, requestedPage, PAGE_SIZE),
    getWishlistIds(),
  ]);
  const current = categories.find((c) => c.slug === category);

  /** Build a URL keeping every current choice, overriding only what is passed. */
  const href = (
    overrides: Partial<Record<"category" | "sort" | "q" | "page", string | undefined>> & {
      brand?: string[];
      min?: string;
      max?: string;
      rating?: string;
      instock?: string;
    } = {},
  ) => {
    const sp = new URLSearchParams();
    const put = (k: string, v?: string) => v && sp.set(k, v);
    put("category", overrides.category ?? category);
    const nextSort = "sort" in overrides ? overrides.sort : sort;
    if (nextSort && nextSort !== "featured") sp.set("sort", nextSort);
    put("q", "q" in overrides ? overrides.q : q);
    ("brand" in overrides ? overrides.brand ?? [] : brands).forEach((b) => sp.append("brand", b));
    put("min", "min" in overrides ? overrides.min : minPrice?.toString());
    put("max", "max" in overrides ? overrides.max : maxPrice?.toString());
    put("rating", "rating" in overrides ? overrides.rating : minRating?.toString());
    put("instock", "instock" in overrides ? overrides.instock : inStock ? "1" : undefined);
    put("page", overrides.page);
    const query = sp.toString();
    return query ? `/shop?${query}` : "/shop";
  };

  const chips: { label: string; href: string }[] = [
    ...brands.map((b) => ({
      label: b,
      href: href({ brand: brands.filter((x) => x !== b), page: undefined }),
    })),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? [
          {
            label: `₹${minPrice ?? 0}–₹${maxPrice ?? facets.maxPrice}`,
            href: href({ min: undefined, max: undefined, page: undefined }),
          },
        ]
      : []),
    ...(minRating ? [{ label: `${minRating}★ & above`, href: href({ rating: undefined, page: undefined }) }] : []),
    ...(inStock ? [{ label: "In stock only", href: href({ instock: undefined, page: undefined }) }] : []),
  ];

  return (
    <div className="shell pt-10 sm:pt-12">
      <p className="eyebrow">Catalogue</p>
      <h1 className="h-display mt-4 text-[2.2rem] leading-none sm:text-[3.5rem]">
        {q ? `“${q}”` : (current?.name ?? "All products")}
      </h1>
      <p className="mt-4 text-[15px] text-slate">
        {q
          ? `Search results in ${current?.name ?? "all departments"}`
          : (current?.tagline ?? "Every department in one place")}
      </p>

      {/* Departments */}
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Categories">
        {[{ slug: "all", name: "All" }, ...categories].map((c) => (
          <Link
            key={c.slug}
            href={href({ category: c.slug, page: undefined })}
            aria-current={category === c.slug ? "page" : undefined}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              category === c.slug
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink hover:border-ink/40",
            )}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {/* Search + sort */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <form action="/shop" role="search" className="flex w-full gap-2 sm:max-w-sm">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="sort" value={sort} />
          {brands.map((b) => (
            <input key={b} type="hidden" name="brand" value={b} />
          ))}
          {minPrice !== undefined && <input type="hidden" name="min" value={minPrice} />}
          {maxPrice !== undefined && <input type="hidden" name="max" value={maxPrice} />}
          {minRating && <input type="hidden" name="rating" value={minRating} />}
          {inStock && <input type="hidden" name="instock" value="1" />}
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search products"
              className="input h-11 pl-10"
              aria-label="Search products, brands or SKU"
            />
          </div>
          <button className="btn-primary btn-sm h-11 px-5">Search</button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <ShopFilters
            variant="trigger"
            facets={facets}
            active={{ brands, minPrice, maxPrice, minRating, inStock }}
            resultCount={result.total}
          />
          <SortSelect value={sort} options={SORT_OPTIONS} />
          <p className="text-sm text-slate tabular">
            {result.total} {result.total === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {/* Active filters */}
      {(chips.length > 0 || q) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate">Active:</span>
          {q && (
            <Link
              href={href({ q: undefined, page: undefined })}
              className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs hover:bg-line"
            >
              “{q}” <X size={12} />
            </Link>
          )}
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs hover:bg-line"
            >
              {chip.label} <X size={12} />
            </Link>
          ))}
          <Link
            href={href({
              q: undefined,
              brand: [],
              min: undefined,
              max: undefined,
              rating: undefined,
              instock: undefined,
              page: undefined,
            })}
            className="text-xs text-slate underline hover:text-ink"
          >
            Clear all
          </Link>
        </div>
      )}

      <div className="mt-8 gap-10 lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-2xl border border-line bg-white p-5">
            <ShopFilters
              variant="panel"
              facets={facets}
              active={{ brands, minPrice, maxPrice, minRating, inStock }}
              resultCount={result.total}
            />
          </div>
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white py-20 text-center">
              <p className="text-lg">Nothing matches these filters yet.</p>
              <p className="mt-2 text-sm text-slate">
                Try a different search, a wider price range, or clear the filters.
              </p>
              <Link href="/shop?category=all" className="btn-outline mt-6">
                Browse all products
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
                {result.items.map((p) => (
                  <ProductCard key={p.id} p={p} saved={saved.has(p.id)} />
                ))}
              </div>
              <Pagination
                className="mt-12"
                page={result.page}
                pageCount={result.pageCount}
                total={result.total}
                pageSize={result.pageSize}
                label="products"
                hrefFor={(p) => href({ page: p === 1 ? undefined : String(p) })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
