import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import {
  BULK_LIMIT,
  confirmPack,
  generateLabel,
  getWarehouseFloor,
  handoverShipment,
  pickAllItems,
  runBulkFloorAction,
  scanPick,
} from "@/lib/services/fulfilment";

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
  z.object({ action: z.literal("pickAll"), shipmentId: z.string() }),
  z.object({
    action: z.literal("bulk"),
    bulkAction: z.enum(["pick", "pack", "label"]),
    shipmentIds: z
      .array(z.string().min(1))
      .min(1, "Select at least one shipment")
      .max(BULK_LIMIT, `Select at most ${BULK_LIMIT} shipments at a time`),
  }),
]);

// POST /api/warehouse  { action, shipmentId | shipmentIds, code? }
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
    case "pickAll":
      return pickAllItems(b.shipmentId, user);
    case "bulk":
      return runBulkFloorAction(b.bulkAction, b.shipmentIds, user);
  }
});

export const dynamic = "force-dynamic";
