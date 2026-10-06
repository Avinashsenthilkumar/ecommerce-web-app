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

export function listCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });
}

export function listProducts(opts: {
  category?: string;
  q?: string;
  sort?: SortKey;
  featured?: boolean;
  newArrival?: boolean;
  take?: number;
}) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    vendor: { status: "APPROVED" },
  };
  if (opts.category && opts.category !== "all")
    where.category = { slug: opts.category };
  if (opts.featured) where.isFeatured = true;
  if (opts.newArrival) where.isNewArrival = true;
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { brand: { name: { contains: opts.q, mode: "insensitive" } } },
      { shortDescription: { contains: opts.q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    opts.sort === "price-asc"
      ? [{ sellingPrice: "asc" }]
      : opts.sort === "price-desc"
        ? [{ sellingPrice: "desc" }]
        : opts.sort === "rating"
          ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }]
          : opts.sort === "newest"
            ? [{ createdAt: "desc" }]
            : [{ isFeatured: "desc" }, { ratingCount: "desc" }];

  return prisma.product.findMany({
    where,
    orderBy,
    take: opts.take,
    include: productCardInclude,
  });
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
    where: {
      status: "ACTIVE",
      vendor: { status: "APPROVED" },
      id: { not: productId },
    },
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
