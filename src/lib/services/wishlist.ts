import { prisma } from "../prisma";
import { ApiError } from "../api";
import { getCurrentUser } from "../auth";
import { productCardInclude } from "./catalog";

export async function toggleWishlist(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ApiError(404, "Product not found.");
  const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } } });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  return { saved: true };
}

export function listWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productCardInclude } },
  });
}

/** Product ids saved by the signed-in customer (empty set for guests). */
export async function getWishlistIds() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") return new Set<string>();
  const rows = await prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
