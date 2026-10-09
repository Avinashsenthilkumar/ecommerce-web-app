import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { BULK_SCAN_LIMIT, getHubOverview, hubBulkScan, hubScan } from "@/lib/services/network";

// GET /api/hub
export const GET = handle(async () => {
  await requireRole(["HUB"]);
  return getHubOverview();
});

const body = z.union([
  z.object({ hubId: z.string().min(1), code: z.string().min(1, "Scan or type a tracking number") }),
  z.object({
    hubId: z.string().min(1),
    codes: z
      .array(z.string())
      .min(1, "Enter at least one code")
      .max(BULK_SCAN_LIMIT, `Scan at most ${BULK_SCAN_LIMIT} parcels at a time`),
  }),
]);

// POST /api/hub  { hubId, code } or { hubId, codes[] }
// Intake / sort / dispatch is decided per parcel by the server.
export const POST = handle(async (req) => {
  const user = await requireRole(["HUB"]);
  const b = await parseBody(req, body);
  return "codes" in b ? hubBulkScan(b.hubId, b.codes, user) : hubScan(b.hubId, b.code, user);
});

export const dynamic = "force-dynamic";
