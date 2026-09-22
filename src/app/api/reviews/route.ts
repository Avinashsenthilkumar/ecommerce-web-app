import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { addReview, reviewSchema } from "@/lib/services/reviews";

// POST /api/reviews  { productId, rating 1-5, comment? } — verified buyers only
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  return addReview(user, await parseBody(req, reviewSchema));
});

export const dynamic = "force-dynamic";
