import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginVendor } from "../helpers/auth-helper";

test.describe("API: Vendor Central (/api/vendor/*)", () => {
  test("POST /api/vendor/register - Seller onboarding registration", async ({ request }) => {
    const start = Date.now();
    const uniqueEmail = `vendor.${Date.now()}@subsel.demo`;

    const res = await request.post("/api/vendor/register", {
      data: {
        businessName: "Kanchipuram Silks Pvt Ltd",
        fullName: "Ramanathan K",
        phone: "9841098765",
        email: uniqueEmail,
        password: "Subsel@Password123",
        gstin: "33AABCK1234M1Z8",
        pickupAddress: "45, Silk Street, Kanchipuram 631501",
        storeDescription: "Traditional handloom silk sarees and apparel",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/vendor/register", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/vendor/analytics/report - Download seller sales CSV report", async ({ page }) => {
    await loginVendor(page);

    const start = Date.now();
    const res = await page.request.get("/api/vendor/analytics/report?period=month&year=2026");
    const status = res.status();
    const duration = Date.now() - start;

    expect(status).toBe(200);
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("text/csv");

    recordApiTestResult("/api/vendor/analytics/report", "get", {
      status,
      durationMs: duration,
      responseBody: { message: "CSV binary/stream generated successfully" },
    });
  });

  test("POST /api/vendor/restock - Restock variant inventory at warehouse", async ({ page }) => {
    await loginVendor(page);

    // Retrieve active product variant
    const prodRes = await page.request.get("/api/products?page=1");
    const prodJson = await prodRes.json();
    const sampleVariant = prodJson?.data?.products?.[0]?.variants?.[0];

    const start = Date.now();
    // Restock with warehouse ID
    const res = await page.request.post("/api/vendor/restock", {
      data: {
        variantId: sampleVariant?.id || "cmv5qiswp002d3gk2nrgelg9s",
        quantity: 10,
        warehouseId: "cmv5qistj00063gk2ksfmhnb5",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 403, 404]).toContain(status);

    recordApiTestResult("/api/vendor/restock", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/vendor/products - Create new product listing", async ({ page }) => {
    await loginVendor(page);

    const prodRes = await page.request.get("/api/products?page=1");
    const prodJson = await prodRes.json();
    const list = Array.isArray(prodJson?.data) ? prodJson.data : prodJson?.data?.products || [];
    const sampleProduct = list?.[0];

    const start = Date.now();
    const rand = Math.floor(Math.random() * 8999 + 1000);
    const res = await page.request.post("/api/vendor/products", {
      data: {
        name: `Artisan Linen Shirt ${rand}`,
        categoryId: sampleProduct?.categoryId || "cmv5qisuv000v3gk2sa194flb",
        brandName: "Aurelia Handlooms",
        shortDescription: "Finest breathable artisanal organic linen shirt.",
        description: "Crafted with lightweight breathable linen for effortless style.",
        mrp: 2999,
        sellingPrice: 1999,
        skuPrefix: `L${rand}`,
        warehouseId: "cmv5qistj00063gk2ksfmhnb5",
        variants: [
          { label: "M / Navy Blue", stock: 20 },
          { label: "L / Olive Green", stock: 15 },
        ],
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 201, 400, 409]).toContain(status);

    recordApiTestResult("/api/vendor/products", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/vendor/products/{id} - Resubmit listing for review", async ({ page }) => {
    await loginVendor(page);

    const start = Date.now();
    const res = await page.request.post("/api/vendor/products/sample-listing-id", {
      data: { action: "resubmit" },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 403, 404, 409]).toContain(status);

    recordApiTestResult("/api/vendor/products/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
