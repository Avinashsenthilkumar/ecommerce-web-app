import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { listWishlist, toggleWishlist } from "@/lib/services/wishlist";

// GET /api/wishlist
export const GET = handle(async () => {
  const user = await requireCustomer();
  return listWishlist(user.id);
});

// POST /api/wishlist  { productId } — toggles saved state
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  const { productId } = await parseBody(req, z.object({ productId: z.string().min(1) }));
  return toggleWishlist(user.id, productId);
});
