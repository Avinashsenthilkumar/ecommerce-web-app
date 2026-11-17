import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { trackOrder } from "@/lib/services/tracking";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(10).max(20).regex(/^[0-9+\s()-]+$/),
});

export const POST = handle(async (req) => {
  await enforceRateLimit(req, "track-order", 10, 10 * 60 * 1000);
  const { orderNumber, phone } = await parseBody(req, schema);
  const order = await trackOrder(orderNumber, phone);
  if (!order) throw new ApiError(404, "We could not find an order matching those details.");
  return order;
});

export const dynamic = "force-dynamic";
