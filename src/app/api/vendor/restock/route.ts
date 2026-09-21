import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { restockSchema, restockVariant } from "@/lib/services/vendor";

// POST /api/vendor/restock  { variantId, warehouseId, quantity }
export const POST = handle(async (req) => {
  const user = await requireRole(["VENDOR"]);
  const body = await parseBody(req, restockSchema);
  return restockVariant(user, body);
});
