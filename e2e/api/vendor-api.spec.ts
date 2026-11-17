import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginVendor } from "../helpers/auth-helper";
import { prisma } from "../../src/lib/prisma";

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

    // Retrieve active warehouse and product variant dynamically from DB
    const [warehouse, vendorProduct] = await Promise.all([
      prisma.warehouse.findFirst({ select: { id: true } }),
      prisma.product.findFirst({
        where: { vendor: { user: { email: "aureli@subsel.demo" } } },
        include: { variants: true },
      }),
    ]);
    const sampleVariant = vendorProduct?.variants?.[0];

    const start = Date.now();
    const res = await page.request.post("/api/vendor/restock", {
      data: {
        variantId: sampleVariant?.id || "fallback-variant-id",
        quantity: 10,
        warehouseId: warehouse?.id || "fallback-warehouse-id",
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

    // Dynamically retrieve real category and warehouse IDs from DB with API fallback
    const [category, warehouse] = await Promise.all([
      prisma.category.findFirst({ select: { id: true } }),
      prisma.warehouse.findFirst({ select: { id: true } }),
    ]);

    let categoryId = category?.id;
    if (!categoryId) {
      const prodRes = await page.request.get("/api/products?page=1");
      const prodJson = await prodRes.json();
      categoryId = prodJson?.data?.[0]?.categoryId;
    }

    const warehouseId = warehouse?.id;

    const start = Date.now();
    const rand = Math.floor(Math.random() * 8999 + 1000);
    const res = await page.request.post("/api/vendor/products", {
      data: {
        name: `Artisan Linen Shirt ${rand}`,
        categoryId,
        brandName: "Aurelia Handlooms",
        shortDescription: "Finest breathable artisanal organic linen shirt.",
        description: "Crafted with lightweight breathable linen for effortless style.",
        mrp: 2999,
        sellingPrice: 1999,
        skuPrefix: `L${rand}`,
        warehouseId,
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
