import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("API: Reverse Logistics (/api/returns)", () => {
  test("POST /api/returns - Validate return request constraints", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.post("/api/returns", {
      data: {
        orderItemId: "non-existent-order-item-id",
        quantity: 1,
        reason: "Size or fit issue",
        comment: "Item did not fit properly",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    // Expected 404/400 because item does not exist or order is not delivered
    expect([400, 404, 422]).toContain(status);

    recordApiTestResult("/api/returns", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
