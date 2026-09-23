import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSettings, resetSettings, saveSettings } from "@/lib/settings";

// GET /api/admin/settings
export const GET = handle(async () => {
  await requireRole(["ADMIN"]);
  return getSettings();
});

// POST /api/admin/settings  { values } or { reset: [keys] }
export const POST = handle(async (req) => {
  await requireRole(["ADMIN"]);
  const b = await parseBody(req, z.object({ values: z.record(z.string()).optional(), reset: z.array(z.string()).optional() }));
  if (b.reset) return resetSettings(b.reset);
  return saveSettings(b.values ?? {});
});

export const dynamic = "force-dynamic";
