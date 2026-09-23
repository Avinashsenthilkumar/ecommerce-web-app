import { z } from "zod";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import { moveStock } from "./inventory";
import { getSettings, rulesFrom } from "../settings";
import type { CurrentUser } from "../auth";

export function listVendors() {
  return prisma.vendor.findMany({
    where: { status: "APPROVED" },
    orderBy: { businessName: "asc" },
    include: { user: { select: { email: true, fullName: true } }, _count: { select: { products: true } } },
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
        variants: { orderBy: { id: "asc" }, include: { inventory: { include: { warehouse: { select: { name: true } } } } } },
      },
    }),
    prisma.orderItem.aggregate({
      where: { variant: { product: { vendorId } }, order: { status: { not: "CANCELLED" } } },
      _sum: { quantity: true, lineTotal: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!vendor) throw new ApiError(404, "Vendor not found.");

  const unitsInStock = products.reduce(
    (s, p) => s + p.variants.reduce((a, v) => a + v.inventory.reduce((b, i) => b + i.available, 0), 0),
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

export const createProductSchema = z
  .object({
    name: z.string().trim().min(3),
    categoryId: z.string().min(1),
    brandName: z.string().trim().min(2),
    shortDescription: z.string().trim().min(5).max(160),
    description: z.string().trim().min(10),
    mrp: z.number().int().positive(),
    sellingPrice: z.number().int().positive(),
    imageUrl: z.string().trim().optional().default(""),
    skuPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,12}$/, "Use 3–12 letters, digits or dashes"),
    warehouseId: z.string().min(1),
    variants: z.array(z.object({ label: z.string().trim().min(1), stock: z.number().int().min(0) })).min(1),
  })
  .refine((v) => v.sellingPrice <= v.mrp, { message: "Selling price cannot be above MRP", path: ["sellingPrice"] });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function createVendorProduct(user: CurrentUser, input: z.infer<typeof createProductSchema>) {
  const vendor = user.vendor;
  if (!vendor) throw new ApiError(403, "Only seller accounts can list products.");
  if (vendor.status !== "APPROVED") throw new ApiError(403, "Your seller account must be approved before you can list products.");

  const threshold = rulesFrom(await getSettings()).lowStockThreshold;
  return prisma.$transaction(async (tx) => {
    let slug = slugify(input.name);
    if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

    const brand = await tx.brand.upsert({ where: { name: input.brandName }, create: { name: input.brandName }, update: {} });
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
        images: input.imageUrl ? { create: [{ url: input.imageUrl, alt: input.name }] } : undefined,
      },
    });

    for (const v of input.variants) {
      const sku = `${input.skuPrefix}-${v.label.toUpperCase().replace(/[^A-Z0-9]+/g, "")}`;
      if (await tx.productVariant.findUnique({ where: { sku } })) throw new ApiError(409, `SKU ${sku} already exists.`);
      const variant = await tx.productVariant.create({ data: { productId: product.id, sku, label: v.label } });
      await tx.inventory.create({ data: { variantId: variant.id, warehouseId: input.warehouseId, lowStockThreshold: threshold } });
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
  }, { timeout: 20000 });
}

export const restockSchema = z.object({
  variantId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
});

export async function restockVariant(user: CurrentUser, input: z.infer<typeof restockSchema>) {
  const vendor = user.vendor;
  const variant = await prisma.productVariant.findUnique({ where: { id: input.variantId }, include: { product: true } });
  if (!variant) throw new ApiError(404, "SKU not found.");
  if (user.role !== "ADMIN" && variant.product.vendorId !== vendor?.id) throw new ApiError(403, "You can only restock your own products.");
  if (user.role !== "ADMIN" && vendor?.status !== "APPROVED") throw new ApiError(403, "Your seller account is not active.");

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
