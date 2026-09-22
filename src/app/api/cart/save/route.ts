import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { saveForLater } from "@/lib/services/cart";

// POST /api/cart/save  { itemId } — move a bag item to the wishlist
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  const { itemId } = await parseBody(req, z.object({ itemId: z.string().min(1) }));
  return saveForLater(user.id, itemId);
});

export const dynamic = "force-dynamic";
