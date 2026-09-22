import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { resubmitListing } from "@/lib/services/sellers";

// POST /api/vendor/products/:id  { action: "resubmit" }
export const POST = handle(async (req, { params }) => {
  const user = await requireRole(["VENDOR"], { allowAdmin: false });
  await parseBody(req, z.object({ action: z.literal("resubmit") }));
  return resubmitListing(user, params.id);
});

export const dynamic = "force-dynamic";
