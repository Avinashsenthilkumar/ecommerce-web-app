import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { approveReturn, rejectReturn } from "@/lib/services/returns";

// POST /api/admin/returns/:id  { action: "approve" | "reject", note? }
export const POST = handle(async (req, { params }) => {
  const admin = await requireRole(["ADMIN"]);
  const body = await parseBody(req, z.object({ action: z.enum(["approve", "reject"]), note: z.string().optional() }));
  return body.action === "approve" ? approveReturn(params.id, admin) : rejectReturn(params.id, admin, body.note);
});
