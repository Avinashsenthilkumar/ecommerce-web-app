import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { requestReturn, returnRequestSchema } from "@/lib/services/orders";

// POST /api/returns  { orderItemId, quantity, reason, comment? }
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  const body = await parseBody(req, returnRequestSchema);
  return requestReturn(user, body);
});
