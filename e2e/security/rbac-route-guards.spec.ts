import { test, expect } from "@playwright/test";
import { loginCustomer, loginVendor, loginAdmin } from "../helpers/auth-helper";

test.describe("Security: Role-Based Access Control (RBAC)", () => {
  test("Guest is redirected to login for protected account and operations routes", async ({ page }) => {
    const protectedRoutes = [
      { path: "/account", targetLogin: "/login" },
      { path: "/orders", targetLogin: "/login" },
      { path: "/vendor", targetLogin: "/vendor/login" },
      { path: "/admin", targetLogin: "/staff/login" },
      { path: "/warehouse", targetLogin: "/staff/login" },
      { path: "/hub", targetLogin: "/staff/login" },
      { path: "/courier", targetLogin: "/staff/login" },
    ];

    for (const route of protectedRoutes) {
      await page.goto(route.path);
      await page.waitForURL((url) => url.pathname.includes(route.targetLogin));
      expect(page.url()).toContain(route.targetLogin);
    }
  });

  test("Customer role cannot access staff consoles or vendor console", async ({ page }) => {
    await loginCustomer(page);

    // Try accessing staff operations routes
    for (const route of ["/admin", "/warehouse", "/hub", "/courier"]) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { name: "You don't have access to this screen" })).toBeVisible();
    }

    // Try accessing vendor console
    await page.goto("/vendor");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "You don't have access to this screen" })).toBeVisible();
  });

  test("Vendor role cannot access staff operations consoles", async ({ page }) => {
    await loginVendor(page);

    for (const route of ["/admin", "/warehouse", "/hub", "/courier"]) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { name: "You don't have access to this screen" })).toBeVisible();
    }
  });

  test("Admin role has access across operations consoles", async ({ page }) => {
    await loginAdmin(page);

    // Admin should successfully load admin overview
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1").first()).toContainText("Overview");

    // Admin can also view warehouse console
    await page.goto("/warehouse");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1").first()).toContainText("Warehouse");
  });
});
