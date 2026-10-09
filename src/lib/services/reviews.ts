import { z } from "zod";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import type { CurrentUser } from "../auth";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  comment: z.string().trim().max(1000).optional(),
});

export type ReviewEligibility = {
  /** Signed-in customer who has not reviewed this product yet. */
  canReview: boolean;
  /** Received this product, so the review earns a "Verified purchase" badge. */
  hasPurchased: boolean;
  orderItemId: string | null;
  reviewed: boolean;
};

/**
 * Any signed-in customer may rate a product once. Buying it is not required —
 * it only decides whether the review is badged as a verified purchase.
 */
export async function reviewEligibility(
  userId: string,
  productId: string,
): Promise<ReviewEligibility> {
  const [item, existing] = await Promise.all([
    prisma.orderItem.findFirst({
      where: {
        variant: { productId },
        order: { userId },
        shipment: { status: "DELIVERED" },
      },
      select: { id: true },
    }),
    prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    }),
  ]);
  return {
    canReview: !existing,
    hasPurchased: !!item,
    orderItemId: item?.id ?? null,
    reviewed: !!existing,
  };
}

export async function addReview(
  user: CurrentUser,
  input: z.infer<typeof reviewSchema>,
) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, status: true, vendor: { select: { status: true } } },
  });
  if (!product || product.status !== "ACTIVE" || product.vendor.status !== "APPROVED") {
    throw new ApiError(404, "This product is no longer available.");
  }

  const e = await reviewEligibility(user.id, input.productId);
  if (e.reviewed) throw new ApiError(409, "You have already reviewed this product.");

  return prisma.$transaction(async (tx) => {
    const p = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
    const count = p.ratingCount + 1;
    const avg =
      Math.round(((p.ratingAvg * p.ratingCount + input.rating) / count) * 10) / 10;
    await tx.product.update({
      where: { id: p.id },
      data: { ratingAvg: avg, ratingCount: count },
    });
    return tx.review.create({
      data: {
        productId: p.id,
        userId: user.id,
        // Present only for a real purchase; drives the verified badge.
        orderItemId: e.orderItemId,
        rating: input.rating,
        comment: input.comment || null,
      },
    });
  });
}

export async function listReviews(productId: string, take = 8) {
  const rows = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { fullName: true } } },
  });
  return rows.map((r) => ({ ...r, verified: r.orderItemId !== null }));
}

/** Star counts for the 5→1 bars next to the average. */
export async function reviewBreakdown(productId: string) {
  const groups = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId },
    _count: { _all: true },
  });
  const byRating = new Map(groups.map((g) => [g.rating, g._count._all]));
  const total = groups.reduce((sum, g) => sum + g._count._all, 0);
  return {
    total,
    rows: [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: byRating.get(star) ?? 0,
      percent: total ? Math.round(((byRating.get(star) ?? 0) / total) * 100) : 0,
    })),
  };
}
