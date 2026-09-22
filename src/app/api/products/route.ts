import { handle } from "@/lib/api";
import { listProducts, productStock, type SortKey } from "@/lib/services/catalog";

// GET /api/products?category=men&q=shoe&sort=price-asc  — public catalog API
export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const products = await listProducts({
    category: url.searchParams.get("category") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: (url.searchParams.get("sort") as SortKey) ?? undefined,
  });
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand.name,
    mrp: p.mrp,
    price: p.sellingPrice,
    rating: p.ratingAvg,
    reviews: p.ratingCount,
    image: p.images[0]?.url ?? null,
    inStock: productStock(p),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label })),
  }));
});

export const dynamic = "force-dynamic";
