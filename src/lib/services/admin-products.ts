import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "../api";
import { prisma } from "../prisma";
import { moveStock } from "./inventory";

const imageUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "res.cloudinary.com" &&
        url.pathname.includes("/image/upload/")
      );
    } catch {
      return false;
    }
  }, "Images must be uploaded to Cloudinary.");

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(100),
  priceOverride: z.number().int().positive().nullable(),
  weightGrams: z.number().int().positive().nullable(),
  stockByWarehouse: z.record(z.string(), z.number().int().min(0).max(100000)),
});

export const adminProductSchema = z
  .object({
    name: z.string().trim().min(3).max(180),
    brandName: z.string().trim().min(2).max(100),
    categoryId: z.string().min(1),
    vendorId: z.string().min(1),
    shortDescription: z.string().trim().min(5).max(160),
    description: z.string().trim().min(10).max(10000),
    mrp: z.number().int().positive(),
    sellingPrice: z.number().int().positive(),
    status: z.nativeEnum(ProductStatus),
    images: z.array(imageUrl).max(5),
    specs: z
      .array(
        z.object({
          key: z.string().trim().min(1).max(100),
          value: z.string().trim().min(1).max(500),
        }),
      )
      .max(50),
    variants: z.array(variantSchema).min(1).max(100),
  })
  .refine((value) => value.sellingPrice <= value.mrp, {
    message: "Selling price cannot be above MRP.",
    path: ["sellingPrice"],
  })
  .refine(
    (value) =>
      new Set(value.variants.map((variant) => variant.sku.toUpperCase())).size ===
      value.variants.length,
    { message: "Each product variant must have a unique SKU.", path: ["variants"] },
  )
  .refine(
    (value) => {
      const ids = value.variants.flatMap((variant) =>
        variant.id ? [variant.id] : [],
      );
      return new Set(ids).size === ids.length;
    },
    { message: "A product variant cannot be included more than once.", path: ["variants"] },
  );

export type AdminProductInput = z.infer<typeof adminProductSchema>;

export async function getAdminProductWorkspace() {
  const [products, categories, vendors, warehouses] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        brand: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" } },
        specs: { orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: { sku: "asc" },
          include: {
            inventory: {
              select: {
                warehouseId: true,
                available: true,
              },
            },
          },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.vendor.findMany({
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true, status: true },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const orderedVendors = vendors.sort(
    (a, b) => Number(b.status === "APPROVED") - Number(a.status === "APPROVED"),
  );
  return { products, categories, vendors: orderedVendors, warehouses };
}

function productSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function saveAdminProduct(
  input: AdminProductInput,
  productId?: string,
  adminId?: string,
) {
  const vendor = await prisma.vendor.findUnique({ where: { id: input.vendorId } });
  if (!vendor) throw new ApiError(422, "Choose a valid seller for this product.");
  if (!(await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
    throw new ApiError(422, "Choose a valid product category.");
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const allowedWarehouseIds = new Set(warehouses.map((warehouse) => warehouse.id));
  for (const variant of input.variants) {
    if (
      Object.keys(variant.stockByWarehouse).some(
        (warehouseId) => !allowedWarehouseIds.has(warehouseId),
      )
    ) {
      throw new ApiError(422, "Stock includes a warehouse that is not active.");
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const existing = productId
        ? await tx.product.findUnique({
            where: { id: productId },
            include: {
              variants: {
                include: {
                  inventory: true,
                  _count: { select: { cartItems: true, orderItems: true, movements: true } },
                },
              },
            },
          })
        : null;
      if (productId && !existing) throw new ApiError(404, "Product not found.");
      if (
        vendor.status !== "APPROVED" &&
        (!existing || existing.vendorId !== vendor.id)
      ) {
        throw new ApiError(422, "New products must belong to an approved seller.");
      }

      const brand = await tx.brand.upsert({
        where: { name: input.brandName },
        create: { name: input.brandName },
        update: {},
      });
      let slug = productSlug(input.name);
      if (!slug) throw new ApiError(422, "Product name must contain letters or numbers.");
      const slugOwner = await tx.product.findUnique({ where: { slug } });
      if (slugOwner && slugOwner.id !== productId)
        slug = `${slug}-${Date.now().toString(36)}`;

      const productData = {
        slug,
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        categoryId: input.categoryId,
        brandId: brand.id,
        vendorId: input.vendorId,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        status: input.status,
      };
      const product = existing
        ? await tx.product.update({ where: { id: productId }, data: productData })
        : await tx.product.create({ data: productData });

      const seenVariantIds = new Set<string>();
      for (const item of input.variants) {
        let variant;
        if (item.id) {
          const found = existing?.variants.find((candidate) => candidate.id === item.id);
          if (!found) throw new ApiError(422, "A variant does not belong to this product.");
          variant = await tx.productVariant.update({
            where: { id: item.id },
            data: {
              sku: item.sku.toUpperCase(),
              label: item.label,
              priceOverride: item.priceOverride,
              weightGrams: item.weightGrams,
            },
          });
          seenVariantIds.add(item.id);
        } else {
          variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: item.sku.toUpperCase(),
              label: item.label,
              priceOverride: item.priceOverride,
              weightGrams: item.weightGrams,
            },
          });
        }

        for (const warehouse of warehouses) {
          const target = item.stockByWarehouse[warehouse.id] ?? 0;
          const previous =
            existing?.variants
              .find((candidate) => candidate.id === variant.id)
              ?.inventory.find((inventory) => inventory.warehouseId === warehouse.id)
              ?.available ?? 0;
          if (target > previous) {
            await moveStock(tx, {
              variantId: variant.id,
              warehouseId: warehouse.id,
              from: null,
              to: "available",
              qty: target - previous,
              reason: "RESTOCK",
              referenceType: "ADMIN_PRODUCT",
              referenceId: product.id,
              actorId: adminId,
              note: "Admin product inventory update",
            });
          } else if (target < previous) {
            await moveStock(tx, {
              variantId: variant.id,
              warehouseId: warehouse.id,
              from: "available",
              to: null,
              qty: previous - target,
              reason: "ADJUSTMENT",
              referenceType: "ADMIN_PRODUCT",
              referenceId: product.id,
              actorId: adminId,
              note: "Admin product inventory adjustment",
            });
          }
        }
      }

      for (const variant of existing?.variants ?? []) {
        if (seenVariantIds.has(variant.id)) continue;
        if (
          variant._count.cartItems > 0 ||
          variant._count.orderItems > 0 ||
          variant._count.movements > 0 ||
          variant.inventory.some(
            (row) =>
              row.available + row.reserved + row.picked + row.packed + row.shipped > 0,
          )
        ) {
          throw new ApiError(
            409,
            `${variant.sku} has stock or order history and cannot be removed.`,
          );
        }
        await tx.productVariant.delete({ where: { id: variant.id } });
      }

      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (input.images.length) {
        await tx.productImage.createMany({
          data: input.images.map((url, sortOrder) => ({
            productId: product.id,
            url,
            alt: input.name,
            sortOrder,
          })),
        });
      }
      await tx.productSpec.deleteMany({ where: { productId: product.id } });
      if (input.specs.length) {
        await tx.productSpec.createMany({
          data: input.specs.map((spec, sortOrder) => ({
            productId: product.id,
            ...spec,
            sortOrder,
          })),
        });
      }
      return { id: product.id, slug: product.slug };
    },
    { timeout: 20000 },
  );
}
