import { test, expect } from "@playwright/test";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("Security: Business Logic & Quantity Tampering", () => {
  test("Reject negative or zero quantities when adding to cart", async ({ page }) => {
    await loginCustomer(page);

    // Negative quantity payload
    const resNegative = await page.request.post("/api/cart", {
      data: { variantId: "any-variant-id", quantity: -5 },
    });
    expect([400, 422]).toContain(resNegative.status());

    // Zero quantity payload
    const resZero = await page.request.post("/api/cart", {
      data: { variantId: "any-variant-id", quantity: 0 },
    });
    expect([400, 422]).toContain(resZero.status());
  });

  test("Reject excessively large quantity (exceeding max item limit)", async ({ page }) => {
    await loginCustomer(page);

    // Excessively large quantity
    const resLarge = await page.request.post("/api/cart", {
      data: { variantId: "any-variant-id", quantity: 99999 },
    });
    expect([400, 422]).toContain(resLarge.status());
  });

  test("Reject non-integer decimal quantities", async ({ page }) => {
    await loginCustomer(page);

    const resDecimal = await page.request.post("/api/cart", {
      data: { variantId: "any-variant-id", quantity: 2.5 },
    });
    expect([400, 422]).toContain(resDecimal.status());
  });

  test("Reject order placement with empty bag", async ({ page }) => {
    await loginCustomer(page);

    // Ensure bag is empty before testing empty bag checkout
    const cartRes = await page.request.get("/api/cart");
    const cartJson = await cartRes.json();
    if (cartJson?.data?.items && Array.isArray(cartJson.data.items)) {
      for (const item of cartJson.data.items) {
        await page.request.patch("/api/cart", { data: { itemId: item.id, quantity: 0 } });
      }
    }

    const resOrder = await page.request.post("/api/orders", {
      headers: { "Idempotency-Key": crypto.randomUUID() },
      data: {
        address: {
          name: "Test User",
          phone: "9876543210",
          line1: "123 Street",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600042",
        },
        paymentMethod: "COD",
      },
    });

    expect([400, 422]).toContain(resOrder.status());
  });
});
