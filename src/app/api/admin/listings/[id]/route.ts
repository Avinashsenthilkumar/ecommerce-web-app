import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { reviewListing } from "@/lib/services/sellers";

// POST /api/admin/listings/:id  { action: approve | reject, reason? }
export const POST = handle(async (req, { params }) => {
  await requireRole(["ADMIN"]);
  const b = await parseBody(req, z.object({ action: z.enum(["approve", "reject"]), reason: z.string().optional() }));
  return reviewListing(params.id, b.action, b.reason);
});

export const dynamic = "force-dynamic";
