import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("API: Shopping Bag (/api/cart, /cart/save)", () => {
  let sampleVariantId: string | null = null;
  let cartItemId: string | null = null;

  test("GET /api/cart - Get bag items and calculations", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.get("/api/cart");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.totals).toBeDefined();

    if (body.data.items && body.data.items.length > 0) {
      cartItemId = body.data.items[0].id;
    }

    recordApiTestResult("/api/cart", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/cart - Add variant to bag", async ({ page }) => {
    await loginCustomer(page);

    // Retrieve active product variant
    const prodRes = await page.request.get("/api/products?page=1");
    const prodJson = await prodRes.json();
    const list = Array.isArray(prodJson?.data) ? prodJson.data : prodJson?.data?.products || [];
    if (list?.[0]?.variants?.[0]?.id) {
      sampleVariantId = list[0].variants[0].id;
    }

    if (!sampleVariantId) {
      // Fallback to active variant
      sampleVariantId = "cmv5qiswp002d3gk2nrgelg9s";
    }

    const start = Date.now();
    const res = await page.request.post("/api/cart", {
      data: { variantId: sampleVariantId, quantity: 1 },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 409]).toContain(status);
    if (status === 200) {
      expect(body.ok).toBe(true);
      if (body.data?.items?.length > 0) {
        cartItemId = body.data.items[0].id;
      }
    }

    recordApiTestResult("/api/cart", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("PATCH /api/cart - Update item quantity in bag", async ({ page }) => {
    await loginCustomer(page);

    // Fetch current cart item
    const cartRes = await page.request.get("/api/cart");
    const cartJson = await cartRes.json();
    if (cartJson?.data?.items?.length > 0) {
      cartItemId = cartJson.data.items[0].id;
    }

    // If still no item in cart, add one first
    if (!cartItemId) {
      const addRes = await page.request.post("/api/cart", {
        data: { variantId: sampleVariantId || "cmv5qiswp002d3gk2nrgelg9s", quantity: 1 },
      });
      const addJson = await addRes.json();
      cartItemId = addJson?.data?.items?.[0]?.id;
    }

    const start = Date.now();
    const res = await page.request.patch("/api/cart", {
      data: { itemId: cartItemId, quantity: 2 },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 409]).toContain(status);
    if (status === 200) {
      expect(body.ok).toBe(true);
    }

    recordApiTestResult("/api/cart", "patch", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/cart/save - Move item to wishlist (save for later)", async ({ page }) => {
    await loginCustomer(page);

    const cartRes = await page.request.get("/api/cart");
    const cartJson = await cartRes.json();
    if (cartJson?.data?.items?.length > 0) {
      cartItemId = cartJson.data.items[0].id;
    }

    // Ensure cart has an item to save for later
    if (!cartItemId) {
      const addRes = await page.request.post("/api/cart", {
        data: { variantId: sampleVariantId || "cmv5qiswp002d3gk2nrgelg9s", quantity: 1 },
      });
      const addJson = await addRes.json();
      cartItemId = addJson?.data?.items?.[0]?.id;
    }

    const start = Date.now();
    const res = await page.request.post("/api/cart/save", {
      data: { itemId: cartItemId },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/cart/save", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
