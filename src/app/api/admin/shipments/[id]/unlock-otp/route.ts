import { handle } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { unlockShipmentOtp } from "@/lib/services/network";

export const POST = handle(async (_req, { params }) => {
  const admin = await requireRole(["ADMIN"]);
  return unlockShipmentOtp(params.id, admin);
});

export const dynamic = "force-dynamic";
