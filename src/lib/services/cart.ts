import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import { sumAvailable } from "./inventory";

export const cartInclude = {
  items: {
    orderBy: { id: "asc" },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: { brand: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartData = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
export type CartLine = CartData["items"][number];

export const FREE_SHIPPING_FROM = 999;
export const SHIPPING_FEE = 99;
export const DISCOUNT_RATE = 0.05; // shown as "Discount (5%)"
export const GST_RATE = 0.18; // shown as "GST (18%)"

export function getCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: cartInclude });
}

export function lineUnitPrice(line: CartLine) {
  return line.variant.priceOverride ?? line.variant.product.sellingPrice;
}

/**
 * Bag pricing, same as the prototype:
 * subtotal − 5% discount = taxable, + 18% GST, + shipping (free from ₹999).
 * Example: ₹23,298 − ₹1,165 = ₹22,133, + ₹3,984 GST = ₹26,117.
 */
export function priceBreakdown(subtotal: number) {
  const discountTotal = Math.round(subtotal * DISCOUNT_RATE);
  const taxable = subtotal - discountTotal;
  const taxTotal = Math.round(taxable * GST_RATE);
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  return { subtotal, discountTotal, taxTotal, shippingFee, grandTotal: taxable + taxTotal + shippingFee };
}

export function cartTotals(items: CartLine[]) {
  const subtotal = items.reduce((s, l) => s + lineUnitPrice(l) * l.quantity, 0);
  const mrpTotal = items.reduce((s, l) => s + l.variant.product.mrp * l.quantity, 0);
  return {
    ...priceBreakdown(subtotal),
    mrpTotal,
    savedVsMrp: Math.max(0, mrpTotal - subtotal),
    units: items.reduce((s, l) => s + l.quantity, 0),
  };
}

export async function cartCount(userId: string) {
  const agg = await prisma.cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}

export async function addToCart(userId: string, variantId: string, qty: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true, name: true, vendor: { select: { status: true } } } } },
  });
  if (!variant || variant.product.status !== "ACTIVE" || variant.product.vendor.status !== "APPROVED") throw new ApiError(404, "This product is no longer available.");

  const stock = sumAvailable(variant.inventory);
  const cart = await prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const nextQty = (existing?.quantity ?? 0) + qty;
  if (nextQty > stock) {
    throw new ApiError(409, stock === 0 ? `${variant.product.name} is out of stock.` : `Only ${stock} left in stock.`);
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: qty },
    update: { quantity: nextQty },
  });
  return { count: await cartCount(userId) };
}

export async function setCartItemQty(userId: string, itemId: string, qty: number) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, variant: { include: { inventory: true } } },
  });
  if (!item || item.cart.userId !== userId) throw new ApiError(404, "Cart item not found.");

  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const stock = sumAvailable(item.variant.inventory);
    if (qty > stock) throw new ApiError(409, `Only ${stock} left in stock.`);
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: qty } });
  }
  return { count: await cartCount(userId) };
}

/** Moves a bag line to the wishlist (Amazon-style "Save for later"). */
export async function saveForLater(userId: string, itemId: string) {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true, variant: true } });
  if (!item || item.cart.userId !== userId) throw new ApiError(404, "Bag item not found.");
  await prisma.$transaction([
    prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: item.variant.productId } },
      create: { userId, productId: item.variant.productId },
      update: {},
    }),
    prisma.cartItem.delete({ where: { id: itemId } }),
  ]);
  return { count: await cartCount(userId) };
}
