import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createProductSchema, createVendorProduct } from "@/lib/services/vendor";

// POST /api/vendor/products — list a new product with variants and opening stock
export const POST = handle(async (req) => {
  const user = await requireRole(["VENDOR"], { allowAdmin: false });
  const body = await parseBody(req, createProductSchema);
  return createVendorProduct(user, body);
});
