import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import { maxAvailableAtWarehouse } from "./inventory";
import { getSettings, rulesFrom, type StoreRules } from "../settings";

export const cartInclude = {
  items: {
    orderBy: { id: "asc" },
    include: {
      variant: {
        include: {
          inventory: { where: { warehouse: { isActive: true } } },
          product: {
            include: {
              brand: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              vendor: { select: { status: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartData = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
export type CartLine = CartData["items"][number];

export async function storeRules() {
  return rulesFrom(await getSettings());
}

export function getCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });
}

export function lineUnitPrice(line: CartLine) {
  return line.variant.priceOverride ?? line.variant.product.sellingPrice;
}

/**
 * Bag pricing, using the percentages saved in admin settings:
 * subtotal − discount = taxable, + GST, + shipping (free above the threshold).
 * Default example: ₹23,298 − 5% = ₹22,133, + 18% GST = ₹26,117.
 */
export function priceBreakdown(subtotal: number, r: StoreRules) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, Math.trunc(subtotal)) : 0;
  const safeDiscountRate = Number.isFinite(r.discountRate)
    ? Math.min(Math.max(0, r.discountRate), 1)
    : 0;
  const safeGstRate = Number.isFinite(r.gstRate)
    ? Math.min(Math.max(0, r.gstRate), 1)
    : 0;

  const discountTotal = Math.round(safeSubtotal * safeDiscountRate);
  const taxable = Math.max(0, safeSubtotal - discountTotal);
  const taxTotal = Math.round(taxable * safeGstRate);
  const shippingFee =
    safeSubtotal === 0 || safeSubtotal >= r.freeShippingFrom ? 0 : r.shippingFee;

  return {
    subtotal: safeSubtotal,
    discountTotal,
    taxTotal,
    shippingFee,
    grandTotal: taxable + taxTotal + shippingFee,
  };
}

export function cartTotals(items: CartLine[], r: StoreRules) {
  const subtotal = items.reduce(
    (s, l) => s + Number(lineUnitPrice(l)) * Number(l.quantity || 0),
    0,
  );
  const mrpTotal = items.reduce(
    (s, l) => s + Number(l.variant.product.mrp) * Number(l.quantity || 0),
    0,
  );
  return {
    ...priceBreakdown(subtotal, r),
    mrpTotal,
    savedVsMrp: Math.max(0, mrpTotal - subtotal),
    units: items.reduce((s, l) => s + Number(l.quantity || 0), 0),
  };
}

export async function cartCount(userId: string) {
  const agg = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function addToCart(
  userId: string,
  variantId: string,
  qty: number,
) {
  const safeQty = Number.isFinite(qty) ? Math.max(0, Math.trunc(qty)) : 0;
  if (safeQty <= 0) {
    throw new ApiError(400, "Quantity must be at least 1.");
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      inventory: { where: { warehouse: { isActive: true } } },
      product: {
        select: {
          status: true,
          name: true,
          vendor: { select: { status: true } },
        },
      },
    },
  });
  if (
    !variant ||
    variant.product.status !== "ACTIVE" ||
    variant.product.vendor.status !== "APPROVED"
  )
    throw new ApiError(404, "This product is no longer available.");

  const stock = maxAvailableAtWarehouse(variant.inventory);
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const nextQty = (existing?.quantity ?? 0) + safeQty;
  if (nextQty > stock) {
    throw new ApiError(
      409,
      stock === 0
        ? `${variant.product.name} is out of stock.`
        : `Only ${stock} left in stock.`,
    );
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: safeQty },
    update: { quantity: nextQty },
  });
  return { count: await cartCount(userId) };
}

export async function setCartItemQty(
  userId: string,
  itemId: string,
  qty: number,
) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true,
      variant: {
        include: {
          inventory: { where: { warehouse: { isActive: true } } },
        },
      },
    },
  });
  if (!item || item.cart.userId !== userId)
    throw new ApiError(404, "Cart item not found.");

  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const stock = maxAvailableAtWarehouse(item.variant.inventory);
    if (qty > stock) throw new ApiError(409, `Only ${stock} left in stock.`);
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: qty },
    });
  }
  return { count: await cartCount(userId) };
}

/** Moves a bag line to the wishlist (Amazon-style "Save for later"). */
export async function saveForLater(userId: string, itemId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, variant: true },
  });
  if (!item || item.cart.userId !== userId)
    throw new ApiError(404, "Bag item not found.");
  await prisma.$transaction([
    prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId, productId: item.variant.productId },
      },
      create: { userId, productId: item.variant.productId },
      update: {},
    }),
    prisma.cartItem.delete({ where: { id: itemId } }),
  ]);
  return { count: await cartCount(userId) };
}
