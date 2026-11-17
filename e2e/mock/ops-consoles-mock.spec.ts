import { test, expect } from "@playwright/test";
import { SELECTORS } from "../helpers/selectors";

test.describe("Frontend Mock: Operations Consoles & Staff Gate", () => {
  test("Staff login page renders with credentials and portal parameter", async ({ page }) => {
    await page.goto("/staff/login");

    await expect(page.locator("h1, h2")).toContainText(["One console for the whole network.", "Sign in"]);
    await expect(page.locator(SELECTORS.auth.emailInput)).toBeVisible();
    await expect(page.locator(SELECTORS.auth.passwordInput)).toBeVisible();
    await expect(page.locator(SELECTORS.auth.submitButton)).toBeVisible();
  });

  test("Vendor login page renders vendor-specific branding", async ({ page }) => {
    await page.goto("/vendor/login");

    await expect(page.locator("h2")).toContainText("Seller login");
    await expect(page.locator(SELECTORS.auth.emailInput)).toBeVisible();
    await expect(page.locator(SELECTORS.auth.passwordInput)).toBeVisible();
    await expect(page.locator('a[href="/vendor/register"]')).toBeVisible();
  });

  test("Unauthenticated access to staff consoles redirects to staff login", async ({ page }) => {
    const protectedStaffRoutes = ["/admin", "/warehouse", "/hub", "/courier"];

    for (const route of protectedStaffRoutes) {
      await page.goto(route);
      await page.waitForURL((url) => url.pathname.includes("/staff/login"));
      expect(page.url()).toContain("/staff/login");
      expect(page.url()).toContain("next=");
    }
  });

  test("Unauthenticated access to vendor console redirects to vendor login", async ({ page }) => {
    await page.goto("/vendor");
    await page.waitForURL((url) => url.pathname.includes("/vendor/login"));
    expect(page.url()).toContain("/vendor/login");
  });
});
