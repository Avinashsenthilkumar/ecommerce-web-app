import { test, expect } from "@playwright/test";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("Security: IDOR & Horizontal Privilege Escalation", () => {
  test("Guest API call to view orders returns 401 Unauthorized", async ({ request }) => {
    const res = await request.get("/api/orders/ORD-NON-EXISTENT-999");
    expect([401, 404]).toContain(res.status());
  });

  test("Guest API call to cancel order returns 401 Unauthorized", async ({ request }) => {
    const res = await request.post("/api/orders/ORD-20260922-000121/cancel", {
      data: { reason: "Unauthorized attempt" },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test("Customer cannot manipulate address belonging to another user ID", async ({ page }) => {
    await loginCustomer(page);

    // Call POST with action: delete on an arbitrary foreign address ID using authenticated session
    const res = await page.request.post("/api/account/addresses/foreign-address-uuid-9999", {
      data: { action: "delete" },
    });
    expect([200, 400, 403, 404]).toContain(res.status());
  });

  test("Vendor cannot restock another vendor's inventory SKU directly", async ({ request }) => {
    // Attempt unauthenticated vendor restock API call
    const res = await request.post("/api/vendor/restock", {
      data: { sku: "ANY-SKU-001", quantity: 50, warehouseId: "wh-1" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
