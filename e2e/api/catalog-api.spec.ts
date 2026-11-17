import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("API: Catalog & Storefront (/api/products, /wishlist, /reviews)", () => {
  let sampleProductId = "prod-1";

  test("GET /api/products - Search & filter catalog products", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/products?page=1");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0 && body.data[0].id) {
      sampleProductId = body.data[0].id;
    }

    recordApiTestResult("/api/products", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/wishlist - Retrieve customer wishlist", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.get("/api/wishlist");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    recordApiTestResult("/api/wishlist", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/wishlist - Toggle product in wishlist", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.post("/api/wishlist", {
      data: { productId: sampleProductId },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.data.saved).toBe("boolean");

    recordApiTestResult("/api/wishlist", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/reviews - Submit product review", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.post("/api/reviews", {
      data: {
        productId: sampleProductId,
        rating: 5,
        comment: "Excellent comfort and materials!",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    // Returns 200 (created), 409 (already reviewed), or 403 (unauthorized)
    expect([200, 403, 409]).toContain(status);

    recordApiTestResult("/api/reviews", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
