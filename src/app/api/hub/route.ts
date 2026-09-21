import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getHubOverview, hubScan } from "@/lib/services/network";

// GET /api/hub
export const GET = handle(async () => {
  await requireRole(["HUB"]);
  return getHubOverview();
});

// POST /api/hub  { hubId, code } — intake / sort / dispatch decided by the server
export const POST = handle(async (req) => {
  const user = await requireRole(["HUB"]);
  const b = await parseBody(req, z.object({ hubId: z.string().min(1), code: z.string().min(1, "Scan or type a tracking number") }));
  return hubScan(b.hubId, b.code, user);
});
