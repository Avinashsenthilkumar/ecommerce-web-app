import { handle } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { advanceRefund } from "@/lib/services/returns";

// POST /api/admin/refunds/:id — move refund to its next stage
export const POST = handle(async (_req, { params }) => {
  const admin = await requireRole(["ADMIN"]);
  return advanceRefund(params.id, admin);
});
