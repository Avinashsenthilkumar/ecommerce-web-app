import { z } from "zod";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import type { CurrentUser } from "../auth";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Only customers who received the product may review it, once. */
export async function reviewEligibility(userId: string, productId: string) {
  const [item, existing] = await Promise.all([
    prisma.orderItem.findFirst({
      where: { variant: { productId }, order: { userId }, shipment: { status: "DELIVERED" } },
      select: { id: true },
    }),
    prisma.review.findUnique({ where: { userId_productId: { userId, productId } } }),
  ]);
  return { canReview: !!item && !existing, orderItemId: item?.id ?? null, reviewed: !!existing };
}

export async function addReview(user: CurrentUser, input: z.infer<typeof reviewSchema>) {
  const e = await reviewEligibility(user.id, input.productId);
  if (e.reviewed) throw new ApiError(409, "You have already reviewed this product.");
  if (!e.orderItemId) throw new ApiError(403, "Only customers who received this product can review it.");

  return prisma.$transaction(async (tx) => {
    const p = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
    const count = p.ratingCount + 1;
    const avg = Math.round(((p.ratingAvg * p.ratingCount + input.rating) / count) * 10) / 10;
    await tx.product.update({ where: { id: p.id }, data: { ratingAvg: avg, ratingCount: count } });
    return tx.review.create({
      data: { productId: p.id, userId: user.id, orderItemId: e.orderItemId, rating: input.rating, comment: input.comment || null },
    });
  });
}

export function listReviews(productId: string, take = 8) {
  return prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { fullName: true } } },
  });
}
