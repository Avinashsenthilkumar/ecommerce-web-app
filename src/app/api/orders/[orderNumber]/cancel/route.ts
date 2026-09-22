import { ApiError, handle } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelOrder } from "@/lib/services/fulfilment";

// POST /api/orders/:orderNumber/cancel — customer cancels before the order is packed
export const POST = handle(async (_req, { params }) => {
  const user = await requireCustomer();
  const order = await prisma.order.findUnique({ where: { orderNumber: params.orderNumber } });
  if (!order || order.userId !== user.id) throw new ApiError(404, "Order not found.");
  return cancelOrder(order.id, user);
});

export const dynamic = "force-dynamic";
