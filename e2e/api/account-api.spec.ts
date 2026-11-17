import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("API: Customer Account (/api/account/*)", () => {
  let createdAddressId: string | null = null;

  test("POST /api/account/addresses - Create new delivery address", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.post("/api/account/addresses", {
      data: {
        address: {
          name: "Priya Narayanan",
          phone: "9840012345",
          line1: "14, 3rd Cross Street",
          line2: "Vijaya Nagar",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600042",
        },
        isDefault: false,
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBeDefined();

    createdAddressId = body.data.id;

    recordApiTestResult("/api/account/addresses", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/account/addresses - List saved addresses", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.get("/api/account/addresses");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (!createdAddressId && body.data.length > 0) {
      createdAddressId = body.data[0].id;
    }

    recordApiTestResult("/api/account/addresses", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/account/addresses/{id} - Set default address", async ({ page }) => {
    await loginCustomer(page);

    // Ensure we have an address
    if (!createdAddressId) {
      const listRes = await page.request.get("/api/account/addresses");
      const listJson = await listRes.json();
      createdAddressId = listJson.data[0]?.id;
    }

    const start = Date.now();
    const res = await page.request.post(`/api/account/addresses/${createdAddressId}`, {
      data: { action: "default" },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/account/addresses/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("PATCH /api/account/addresses/{id} - Update address details", async ({ page }) => {
    await loginCustomer(page);

    if (!createdAddressId) {
      const listRes = await page.request.get("/api/account/addresses");
      const listJson = await listRes.json();
      createdAddressId = listJson.data[0]?.id;
    }

    const start = Date.now();
    const res = await page.request.patch(`/api/account/addresses/${createdAddressId}`, {
      data: {
        address: {
          name: "Priya N. Updated",
          phone: "9840012345",
          line1: "14, 3rd Cross Street",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600042",
        },
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/account/addresses/{id}", "patch", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
