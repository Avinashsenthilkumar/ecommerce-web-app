import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const productCardInclude = {
  brand: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: {
    orderBy: { id: "asc" },
    include: {
      inventory: { where: { warehouse: { isActive: true } } },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{
  include: typeof productCardInclude;
}>;

export type SortKey =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "newest";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "rating", label: "Top rated" },
];

export const PAGE_SIZE = 12;

/** Every filter the shop page understands. All of them are optional. */
export type ProductFilters = {
  category?: string;
  q?: string;
  sort?: SortKey;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  featured?: boolean;
  newArrival?: boolean;
};

export function listCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: {
          products: { where: { status: "ACTIVE", vendor: { status: "APPROVED" } } },
        },
      },
    },
  });
}

/** Only listings that are live and belong to an approved seller are ever shown. */
function baseWhere(): Prisma.ProductWhereInput {
  return { status: "ACTIVE", vendor: { status: "APPROVED" } };
}

function buildWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = baseWhere();
  if (f.category && f.category !== "all") where.category = { slug: f.category };
  if (f.featured) where.isFeatured = true;
  if (f.newArrival) where.isNewArrival = true;
  if (f.brands?.length) where.brand = { name: { in: f.brands } };
  if (f.minRating) where.ratingAvg = { gte: f.minRating };

  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    where.sellingPrice = {};
    if (f.minPrice !== undefined) where.sellingPrice.gte = f.minPrice;
    if (f.maxPrice !== undefined) where.sellingPrice.lte = f.maxPrice;
  }

  // "In stock" means at least one unit sitting in an active fulfilment centre.
  if (f.inStock) {
    where.variants = {
      some: {
        inventory: {
          some: { available: { gt: 0 }, warehouse: { isActive: true } },
        },
      },
    };
  }

  if (f.q) {
    const q = f.q;
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
          { shortDescription: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      },
    ];
  }
  return where;
}

function buildOrderBy(sort?: SortKey): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ sellingPrice: "asc" }, { name: "asc" }];
    case "price-desc":
      return [{ sellingPrice: "desc" }, { name: "asc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { ratingCount: "desc" }, { name: "asc" }];
  }
}

export function listProducts(
  opts: ProductFilters & { take?: number; skip?: number },
) {
  return prisma.product.findMany({
    where: buildWhere(opts),
    orderBy: buildOrderBy(opts.sort),
    take: opts.take,
    skip: opts.skip,
    include: productCardInclude,
  });
}

/** One page of results plus the total, so the UI can draw pagination. */
export async function listProductsPage(
  filters: ProductFilters,
  page: number,
  pageSize = PAGE_SIZE,
) {
  const where = buildWhere(filters);
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // Clamp before querying, so a page number past the end (an old link, a
  // bookmark, a filter that shrank the result set) still shows real products.
  const current = Math.min(Math.max(1, page), pageCount);
  const items = await prisma.product.findMany({
    where,
    orderBy: buildOrderBy(filters.sort),
    skip: (current - 1) * pageSize,
    take: pageSize,
    include: productCardInclude,
  });
  return { items, total, page: current, pageCount, pageSize };
}

/**
 * Brand list and price range for the filter panel, scoped to the current
 * category and search so the options never lead to an empty result set.
 */
export async function getProductFacets(
  filters: Pick<ProductFilters, "category" | "q">,
) {
  const where = buildWhere(filters);
  const [brands, range] = await Promise.all([
    prisma.product.groupBy({
      by: ["brandId"],
      where,
      _count: { _all: true },
    }),
    prisma.product.aggregate({
      where,
      _min: { sellingPrice: true },
      _max: { sellingPrice: true },
    }),
  ]);

  const names = brands.length
    ? await prisma.brand.findMany({
        where: { id: { in: brands.map((b) => b.brandId) } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];
  const countById = new Map(brands.map((b) => [b.brandId, b._count._all]));

  return {
    brands: names.map((b) => ({ name: b.name, count: countById.get(b.id) ?? 0 })),
    minPrice: range._min.sellingPrice ?? 0,
    maxPrice: range._max.sellingPrice ?? 0,
  };
}

export function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      vendor: { select: { businessName: true, status: true } },
      images: { orderBy: { sortOrder: "asc" } },
      specs: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: { id: "asc" },
        include: {
          inventory: {
            where: { warehouse: { isActive: true } },
            include: {
              warehouse: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getProductBySlug>>
>;

export function relatedProducts(productId: string, take = 4) {
  return prisma.product.findMany({
    where: { ...baseWhere(), id: { not: productId } },
    orderBy: [{ isNewArrival: "desc" }, { ratingCount: "desc" }],
    take,
    include: productCardInclude,
  });
}

export function productStock(p: {
  variants: { inventory: { available: number }[] }[];
}) {
  return p.variants.reduce(
    (s, v) => s + v.inventory.reduce((a, i) => a + i.available, 0),
    0,
  );
}
