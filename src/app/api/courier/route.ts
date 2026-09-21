import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { deliverShipment, failDelivery, getCourierBoard } from "@/lib/services/network";
import { pickupReturn, qcReturn } from "@/lib/services/returns";

// GET /api/courier
export const GET = handle(async () => {
  await requireRole(["COURIER"]);
  return getCourierBoard();
});

const body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("deliver"),
    shipmentId: z.string(),
    code: z.string().min(1, "Scan the parcel QR"),
    otp: z.string().regex(/^\d{4}$/, "OTP is 4 digits"),
    codCollected: z.number().int().min(0).optional(),
  }),
  z.object({ action: z.literal("fail"), shipmentId: z.string(), reason: z.string().min(3) }),
  z.object({ action: z.literal("pickup"), returnId: z.string() }),
  z.object({ action: z.literal("qc"), returnId: z.string(), pass: z.boolean(), notes: z.string().optional() }),
]);

// POST /api/courier  { action, ... }
export const POST = handle(async (req) => {
  const user = await requireRole(["COURIER"]);
  const b = await parseBody(req, body);
  switch (b.action) {
    case "deliver":
      return deliverShipment(b.shipmentId, { code: b.code, otp: b.otp, codCollected: b.codCollected }, user);
    case "fail":
      return failDelivery(b.shipmentId, b.reason, user);
    case "pickup":
      return pickupReturn(b.returnId, user);
    case "qc":
      return qcReturn(b.returnId, b.pass, b.notes, user);
  }
});
