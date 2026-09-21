import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { confirmPack, generateLabel, getWarehouseFloor, handoverShipment, scanPick } from "@/lib/services/fulfilment";

// GET /api/warehouse — floor queues
export const GET = handle(async () => {
  await requireRole(["WAREHOUSE"]);
  return getWarehouseFloor();
});

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pick"), shipmentId: z.string(), code: z.string().min(1, "Scan or type a SKU") }),
  z.object({ action: z.literal("pack"), shipmentId: z.string() }),
  z.object({ action: z.literal("label"), shipmentId: z.string() }),
  z.object({ action: z.literal("handover"), shipmentId: z.string(), code: z.string().min(1, "Scan the parcel QR") }),
]);

// POST /api/warehouse  { action, shipmentId, code? }
export const POST = handle(async (req) => {
  const user = await requireRole(["WAREHOUSE"]);
  const b = await parseBody(req, body);
  switch (b.action) {
    case "pick":
      return scanPick(b.shipmentId, b.code, user);
    case "pack":
      return confirmPack(b.shipmentId, user);
    case "label":
      return generateLabel(b.shipmentId, user);
    case "handover":
      return handoverShipment(b.shipmentId, b.code, user);
  }
});
