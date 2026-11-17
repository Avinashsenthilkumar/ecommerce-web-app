import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { DEMO_CREDENTIALS } from "../helpers/auth-helper";

test.describe("API: Authentication (/api/auth/*)", () => {
  test("POST /api/auth/register - Register new customer account", async ({ request }) => {
    const start = Date.now();
    const uniqueEmail = `test.user.${Date.now()}@subsel.demo`;

    const res = await request.post("/api/auth/register", {
      data: {
        fullName: "Test Customer",
        phone: "9876543210",
        email: uniqueEmail,
        password: "Subsel@Password123",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/auth/register", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/auth/login - Authenticate customer credentials", async ({ request }) => {
    const start = Date.now();

    const res = await request.post("/api/auth/login", {
      data: {
        email: DEMO_CREDENTIALS.customer.email,
        password: DEMO_CREDENTIALS.customer.password,
        portal: "customer",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.home).toBeDefined();

    recordApiTestResult("/api/auth/login", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/auth/logout - Sign out and invalidate session", async ({ page }) => {
    // First sign in via page to obtain session cookie
    await page.request.post("/api/auth/login", {
      data: {
        email: DEMO_CREDENTIALS.customer.email,
        password: DEMO_CREDENTIALS.customer.password,
        portal: "customer",
      },
    });

    const start = Date.now();
    const res = await page.request.post("/api/auth/logout");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/auth/logout", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
