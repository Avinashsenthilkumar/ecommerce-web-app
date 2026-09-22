import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { allocateOrder, cancelOrder, confirmOrder } from "@/lib/services/fulfilment";

// POST /api/admin/orders/:id  { action: "confirm" | "allocate" | "cancel" }
export const POST = handle(async (req, { params }) => {
  const admin = await requireRole(["ADMIN"]);
  const { action } = await parseBody(req, z.object({ action: z.enum(["confirm", "allocate", "cancel"]) }));
  if (action === "confirm") return confirmOrder(params.id);
  if (action === "allocate") return allocateOrder(params.id, admin);
  return cancelOrder(params.id, admin);
});

export const dynamic = "force-dynamic";
