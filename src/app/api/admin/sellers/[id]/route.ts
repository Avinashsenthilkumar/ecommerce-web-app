import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { setSellerStatus } from "@/lib/services/sellers";

// POST /api/admin/sellers/:id  { action: approve | reject | suspend | reinstate, reason? }
export const POST = handle(async (req, { params }) => {
  const admin = await requireRole(["ADMIN"]);
  const b = await parseBody(req, z.object({ action: z.enum(["approve", "reject", "suspend", "reinstate"]), reason: z.string().optional() }));
  return setSellerStatus(params.id, b.action, admin, b.reason);
});

export const dynamic = "force-dynamic";
