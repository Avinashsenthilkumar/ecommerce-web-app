import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { adminProductSchema, saveAdminProduct } from "@/lib/services/admin-products";

export const POST = handle(async (req) => {
  const admin = await requireRole(["ADMIN"]);
  const input = await parseBody(req, adminProductSchema);
  return saveAdminProduct(input, undefined, admin.id);
});

export const dynamic = "force-dynamic";
