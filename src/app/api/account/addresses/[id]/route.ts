import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { deleteAddress, setDefaultAddress } from "@/lib/services/account";

// POST /api/account/addresses/:id  { action: "default" | "delete" }
export const POST = handle(async (req, { params }) => {
  const user = await requireCustomer();
  const { action } = await parseBody(req, z.object({ action: z.enum(["default", "delete"]) }));
  return action === "default" ? setDefaultAddress(user.id, params.id) : deleteAddress(user.id, params.id);
});
