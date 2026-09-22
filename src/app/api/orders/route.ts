import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { listOrdersForUser, placeOrder, placeOrderSchema } from "@/lib/services/orders";

// GET /api/orders — current user's orders with shipments and scan trail
export const GET = handle(async () => {
  const user = await requireCustomer();
  return listOrdersForUser(user.id);
});

// POST /api/orders  { address, paymentMethod }  — checkout from cart
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  const body = await parseBody(req, placeOrderSchema);
  return placeOrder(user.id, body);
});

export const dynamic = "force-dynamic";
