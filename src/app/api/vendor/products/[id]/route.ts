import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { resubmitListing } from "@/lib/services/sellers";
import {
  priceReviewSchema,
  submitProductPriceForReview,
} from "@/lib/services/vendor";

// POST /api/vendor/products/:id  { action: "resubmit" }
export const POST = handle(async (req, { params }) => {
  const user = await requireRole(["VENDOR"], { allowAdmin: false });
  await parseBody(req, z.object({ action: z.literal("resubmit") }));
  return resubmitListing(user, params.id);
});

export const PATCH = handle(async (req, { params }) => {
  const user = await requireRole(["VENDOR"], { allowAdmin: false });
  const body = await parseBody(req, priceReviewSchema);
  return submitProductPriceForReview(user, params.id, body);
});

export const dynamic = "force-dynamic";
