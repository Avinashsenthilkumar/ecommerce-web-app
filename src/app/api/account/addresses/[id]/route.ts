import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { deleteAddress, setDefaultAddress } from "@/lib/services/account";
import { updateAddress } from "@/lib/services/account";
import { addressSchema } from "@/lib/services/orders";

// POST /api/account/addresses/:id  { action: "default" | "delete" }
export const POST = handle(async (req, { params }) => {
  const user = await requireCustomer();
  const { action } = await parseBody(req, z.object({ action: z.enum(["default", "delete"]) }));
  return action === "default" ? setDefaultAddress(user.id, params.id) : deleteAddress(user.id, params.id);
});

export const PATCH = handle(async (req, { params }) => {
  const user = await requireCustomer();
  const body = await parseBody(
    req,
    z.object({ address: addressSchema, isDefault: z.boolean().optional() }),
  );
  return updateAddress(user.id, params.id, body.address, body.isDefault);
});

export const dynamic = "force-dynamic";
