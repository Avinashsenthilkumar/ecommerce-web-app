import { handle } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/admin";

// GET /api/admin/overview
export const GET = handle(async () => {
  await requireRole(["ADMIN"]);
  return getAdminDashboard();
});

export const dynamic = "force-dynamic";
