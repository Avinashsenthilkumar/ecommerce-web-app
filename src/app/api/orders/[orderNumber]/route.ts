import { ApiError, handle } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrderForUser } from "@/lib/services/orders";

// GET /api/orders/:orderNumber — tracking detail
export const GET = handle(async (_req, { params }) => {
  const user = await requireUser();
  const order = await getOrderForUser(params.orderNumber, user);
  if (!order) throw new ApiError(404, "Order not found.");
  return order;
});

export const dynamic = "force-dynamic";
