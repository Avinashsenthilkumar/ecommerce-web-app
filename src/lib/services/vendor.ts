import { z } from "zod";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import { moveStock } from "./inventory";
import { getSettings, rulesFrom } from "../settings";
import type { CurrentUser } from "../auth";
import { resolveProductImageUrl } from "../product-image";

export function listVendors() {
  return prisma.vendor.findMany({
    where: { status: "APPROVED" },
    orderBy: { businessName: "asc" },
    include: {
      user: { select: { email: true, fullName: true } },
      _count: { select: { products: true } },
    },
  });
}

export async function getVendorDashboard(vendorId: string) {
  const [vendor, products, sales, categories, warehouses] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId } }),
    prisma.product.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        category: true,
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: { id: "asc" },
          include: {
            inventory: {
              include: {
                warehouse: { select: { name: true, isActive: true } },
              },
            },
          },
        },
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        variant: { product: { vendorId } },
        order: { status: { not: "CANCELLED" } },
      },
      _sum: { quantity: true, lineTotal: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!vendor) throw new ApiError(404, "Vendor not found.");

  const unitsInStock = products.reduce(
    (s, p) =>
      s +
      p.variants.reduce(
        (a, v) =>
          a +
          v.inventory.reduce(
            (b, i) => b + (i.warehouse.isActive ? i.available : 0),
            0,
          ),
        0,
      ),
    0,
  );
  const revenue = sales._sum.lineTotal ?? 0;
  return {
    vendor,
    products,
    categories,
    warehouses,
    stats: {
      products: products.length,
      unitsInStock,
      unitsSold: sales._sum.quantity ?? 0,
      revenue,
      payout: Math.round(revenue * (1 - vendor.commissionPercent / 100)),
    },
  };
}

export async function getVendorAnalytics(vendorId: string) {
  const [vendor, products, items] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId } }),
    prisma.product.findMany({
      where: { vendorId },
      select: {
        id: true,
        name: true,
        status: true,
        variants: {
          select: {
            inventory: {
              select: {
                available: true,
                lowStockThreshold: true,
                warehouse: { select: { isActive: true } },
              },
            },
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        variant: { product: { vendorId } },
        order: { status: { not: "CANCELLED" } },
      },
      select: {
        quantity: true,
        lineTotal: true,
        variant: {
          select: {
            product: { select: { id: true, name: true } },
          },
        },
        order: {
          select: {
            orderNumber: true,
            placedAt: true,
            status: true,
          },
        },
      },
      orderBy: { order: { placedAt: "desc" } },
    }),
  ]);
  if (!vendor) throw new ApiError(404, "Vendor not found.");

  const productStock = products.map((product) => {
    const inventory = product.variants.flatMap((variant) => variant.inventory)
      .filter((entry) => entry.warehouse.isActive);
    const units = inventory.reduce((sum, entry) => sum + entry.available, 0);
    return {
      id: product.id,
      name: product.name,
      status: product.status,
      units,
      lowStock:
        units === 0 ||
        inventory.some((entry) => entry.available <= entry.lowStockThreshold),
    };
  });

  const byProduct = new Map<string, { name: string; unitsSold: number; revenue: number }>();
  const byOrder = new Map<
    string,
    {
      orderNumber: string;
      placedAt: Date;
      status: string;
      unitsSold: number;
      revenue: number;
    }
  >();
  let unitsSold = 0;
  let revenue = 0;
  const pendingStatuses = new Set(["PLACED", "CONFIRMED", "ALLOCATED", "PROCESSING"]);

  for (const item of items) {
    const { id, name } = item.variant.product;
    const product = byProduct.get(id) ?? { name, unitsSold: 0, revenue: 0 };
    product.unitsSold += item.quantity;
    product.revenue += item.lineTotal;
    byProduct.set(id, product);

    const { orderNumber, placedAt, status } = item.order;
    const order = byOrder.get(orderNumber) ?? {
      orderNumber,
      placedAt,
      status,
      unitsSold: 0,
      revenue: 0,
    };
    order.unitsSold += item.quantity;
    order.revenue += item.lineTotal;
    byOrder.set(orderNumber, order);
    unitsSold += item.quantity;
    revenue += item.lineTotal;
  }

  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dayKey = (date: Date) => date.toISOString().slice(0, 10);
  const weekStart = (date: Date) => {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    day.setUTCHours(0, 0, 0, 0);
    return day;
  };
  const weekKey = (date: Date) => dayKey(weekStart(date));
  const monthKey = (date: Date) => date.toISOString().slice(0, 7);

  const makeTrend = (
    keys: string[],
    label: (key: string) => string,
    keyForDate: (date: Date) => string,
  ) => {
    const buckets = new Map(
      keys.map((key) => [key, { label: label(key), unitsSold: 0, revenue: 0 }]),
    );
    for (const item of items) {
      const bucket = buckets.get(keyForDate(item.order.placedAt));
      if (bucket) {
        bucket.unitsSold += item.quantity;
        bucket.revenue += item.lineTotal;
      }
    }
    return [...buckets.values()];
  };

  const dailyKeys = Array.from({ length: 7 }, (_, index) =>
    dayKey(new Date(utcToday - (6 - index) * 24 * 60 * 60 * 1000)),
  );
  const currentWeek = weekStart(new Date(utcToday));
  const weeklyKeys = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setUTCDate(start.getUTCDate() - (7 - index) * 7);
    return dayKey(start);
  });
  const currentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthlyKeys = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - (5 - index), 1));
    return monthKey(month);
  });
  const dailyLabel = (key: string) =>
    new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(`${key}T00:00:00Z`));
  const weeklyLabel = (key: string) =>
    new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(`${key}T00:00:00Z`));
  const monthlyLabel = (key: string) =>
    new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" })
      .format(new Date(`${key}-01T00:00:00Z`));
  const orderList = [...byOrder.values()].sort(
    (a, b) => b.placedAt.getTime() - a.placedAt.getTime(),
  );
  const productPerformance = productStock
    .map((product) => {
      const sales = byProduct.get(product.id);
      return {
        ...product,
        unitsSold: sales?.unitsSold ?? 0,
        revenue: sales?.revenue ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);

  return {
    vendor,
    stats: {
      totalProducts: products.length,
      activeProducts: productStock.filter((product) => product.status === "ACTIVE").length,
      outOfStock: productStock.filter((product) => product.units === 0).length,
      unitsSold,
      revenue,
      orders: orderList.length,
      pendingOrders: orderList.filter((order) => pendingStatuses.has(order.status)).length,
      totalStock: productStock.reduce((sum, product) => sum + product.units, 0),
      lowStock: productStock.filter((product) => product.lowStock).length,
      payout: Math.round(revenue * (1 - vendor.commissionPercent / 100)),
    },
    topSellingProducts: [...productPerformance]
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .filter((product) => product.unitsSold > 0)
      .slice(0, 5),
    productPerformance,
    recentSales: orderList.slice(0, 8),
    trends: {
      daily: makeTrend(dailyKeys, dailyLabel, dayKey),
      weekly: makeTrend(weeklyKeys, weeklyLabel, weekKey),
      monthly: makeTrend(monthlyKeys, monthlyLabel, monthKey),
    },
  };
}

export async function getVendorSalesReport(
  vendorId: string,
  period: "day" | "month" | "year",
  year?: number,
) {
  const items = await prisma.orderItem.findMany({
    where: {
      variant: { product: { vendorId } },
      order: { status: { not: "CANCELLED" } },
    },
    select: {
      quantity: true,
      lineTotal: true,
      order: { select: { id: true, placedAt: true } },
    },
    orderBy: { order: { placedAt: "asc" } },
  });
  const groups = new Map<string, { orders: Set<string>; units: number; revenue: number }>();

  for (const item of items) {
    const date = item.order.placedAt;
    const key = period === "year"
      ? String(date.getUTCFullYear())
      : period === "month"
        ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
        : date.toISOString().slice(0, 10);
    if (year !== undefined && period !== "year" && date.getUTCFullYear() !== year) continue;
    const group = groups.get(key) ?? { orders: new Set<string>(), units: 0, revenue: 0 };
    group.orders.add(item.order.id);
    group.units += item.quantity;
    group.revenue += item.lineTotal;
    groups.set(key, group);
  }

  if (period === "year") {
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, group]) => ({
        period: label,
        orders: group.orders.size,
        unitsSold: group.units,
        revenue: group.revenue,
      }));
  }

  const now = new Date();
  const selectedYear = year ?? now.getUTCFullYear();
  const bucketCount =
    period === "month"
      ? selectedYear === now.getUTCFullYear()
        ? now.getUTCMonth() + 1
        : 12
      : (selectedYear === now.getUTCFullYear()
          ? Math.floor(
              (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
                Date.UTC(selectedYear, 0, 1)) /
                86_400_000,
            ) + 1
          : (Date.UTC(selectedYear + 1, 0, 1) - Date.UTC(selectedYear, 0, 1)) /
            86_400_000);

  return Array.from({ length: bucketCount }, (_, index) => {
    const date = period === "month"
      ? new Date(Date.UTC(selectedYear, index, 1))
      : new Date(Date.UTC(selectedYear, 0, index + 1));
    const label = period === "month"
      ? `${selectedYear}-${String(index + 1).padStart(2, "0")}`
      : date.toISOString().slice(0, 10);
    const group = groups.get(label);
    return {
      period: label,
      orders: group?.orders.size ?? 0,
      unitsSold: group?.units ?? 0,
      revenue: group?.revenue ?? 0,
    };
  });
}

export const createProductSchema = z
  .object({
    name: z.string().trim().min(3),
    categoryId: z.string().min(1),
    brandName: z.string().trim().min(2),
    shortDescription: z.string().trim().min(5).max(160),
    description: z.string().trim().min(10),
    mrp: z.number().int().positive(),
    sellingPrice: z.number().int().positive(),
    images: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .refine(
            (value) =>
              value.startsWith("https://") ||
              value.startsWith("http://") ||
              value.startsWith("/"),
            "Product images must be Cloudinary URLs or application-relative URLs.",
          ),
      )
      .max(5)
      .optional()
      .default([]),
    imageUrl: z.string().trim().optional().default(""),
    skuPrefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,12}$/, "Use 3–12 letters, digits or dashes"),
    warehouseId: z.string().min(1),
    variants: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          stock: z.number().int().min(0),
        }),
      )
      .min(1),
  })
  .refine((v) => v.sellingPrice <= v.mrp, {
    message: "Selling price cannot be above MRP",
    path: ["sellingPrice"],
  })
  .refine(
    (v) =>
      v.images.reduce((total, image) => total + image.length, 0) <= 4_300_000,
    {
      message: "Uploaded images exceed the maximum total size",
      path: ["images"],
    },
  );

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function createVendorProduct(
  user: CurrentUser,
  input: z.infer<typeof createProductSchema>,
) {
  const vendor = user.vendor;
  if (!vendor)
    throw new ApiError(403, "Only seller accounts can list products.");
  if (vendor.status !== "APPROVED")
    throw new ApiError(
      403,
      "Your seller account must be approved before you can list products.",
    );

  const threshold = rulesFrom(await getSettings()).lowStockThreshold;
  return prisma.$transaction(
    async (tx) => {
      let slug = slugify(input.name);
      if (await tx.product.findUnique({ where: { slug } }))
        slug = `${slug}-${Date.now().toString(36)}`;

      const brand = await tx.brand.upsert({
        where: { name: input.brandName },
        create: { name: input.brandName },
        update: {},
      });
      const imageUrls = input.images.length
        ? input.images
        : [resolveProductImageUrl(input.name, input.imageUrl)];
      const product = await tx.product.create({
        data: {
          slug,
          name: input.name,
          shortDescription: input.shortDescription,
          description: input.description,
          categoryId: input.categoryId,
          brandId: brand.id,
          vendorId: vendor.id,
          mrp: input.mrp,
          sellingPrice: input.sellingPrice,
          isNewArrival: true,
          status: "PENDING_REVIEW", // goes live after admin review
          images: {
            create: imageUrls.map((url, sortOrder) => ({
              url,
              alt: input.name,
              sortOrder,
            })),
          },
        },
      });

      for (const v of input.variants) {
        const sku = `${input.skuPrefix}-${v.label.toUpperCase().replace(/[^A-Z0-9]+/g, "")}`;
        if (await tx.productVariant.findUnique({ where: { sku } }))
          throw new ApiError(409, `SKU ${sku} already exists.`);
        const variant = await tx.productVariant.create({
          data: { productId: product.id, sku, label: v.label },
        });
        await tx.inventory.create({
          data: {
            variantId: variant.id,
            warehouseId: input.warehouseId,
            lowStockThreshold: threshold,
          },
        });
        if (v.stock > 0) {
          await moveStock(tx, {
            variantId: variant.id,
            warehouseId: input.warehouseId,
            from: null,
            to: "available",
            qty: v.stock,
            reason: "RESTOCK",
            referenceType: "VENDOR",
            referenceId: vendor.businessName,
            actorId: user.id,
            note: "Opening stock",
          });
        }
      }
      return { slug };
    },
    { timeout: 20000 },
  );
}

export const restockSchema = z.object({
  variantId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
});

export async function restockVariant(
  user: CurrentUser,
  input: z.infer<typeof restockSchema>,
) {
  const vendor = user.vendor;
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: true },
  });
  if (!variant) throw new ApiError(404, "SKU not found.");
  if (user.role !== "ADMIN" && variant.product.vendorId !== vendor?.id)
    throw new ApiError(403, "You can only restock your own products.");
  if (user.role !== "ADMIN" && vendor?.status !== "APPROVED")
    throw new ApiError(403, "Your seller account is not active.");

  await prisma.$transaction((tx) =>
    moveStock(tx, {
      variantId: variant.id,
      warehouseId: input.warehouseId,
      from: null,
      to: "available",
      qty: input.quantity,
      reason: "RESTOCK",
      referenceType: "VENDOR",
      referenceId: vendor?.businessName ?? "Admin",
      actorId: user.id,
    }),
  );
  return { sku: variant.sku, added: input.quantity };
}
