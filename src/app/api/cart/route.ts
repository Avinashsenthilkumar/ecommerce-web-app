import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { addToCart, cartTotals, getCart, setCartItemQty } from "@/lib/services/cart";

// GET /api/cart
export const GET = handle(async () => {
  const user = await requireCustomer();
  const cart = await getCart(user.id);
  return { items: cart.items, totals: cartTotals(cart.items) };
});

// POST /api/cart  { variantId, quantity }
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  const body = await parseBody(req, z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(20).default(1) }));
  return addToCart(user.id, body.variantId, body.quantity);
});

// PATCH /api/cart  { itemId, quantity }  (quantity 0 removes)
export const PATCH = handle(async (req) => {
  const user = await requireCustomer();
  const body = await parseBody(req, z.object({ itemId: z.string().min(1), quantity: z.number().int().min(0).max(20) }));
  return setCartItemQty(user.id, body.itemId, body.quantity);
});

export const dynamic = "force-dynamic";
