import { test, expect } from "@playwright/test";
import { loginVendor, loginAdmin } from "../helpers/auth-helper";

test.describe("Real Full-Stack: Seller Lifecycle & Onboarding", () => {
  test("Pending seller sees application review status screen", async ({ page }) => {
    // lotus@subsel.demo is seeded with status PENDING
    await loginVendor(page, true);

    await page.goto("/vendor");
    await page.waitForLoadState("domcontentloaded");

    // Must display review notice
    await expect(page.locator("h1")).toContainText("under review");
  });

  test("Approved seller sees catalog management dashboard and stats", async ({ page }) => {
    // aureli@subsel.demo is seeded with status APPROVED
    await loginVendor(page, false);

    await page.goto("/vendor");
    await page.waitForLoadState("domcontentloaded");

    // Must display vendor metrics
    await expect(page.locator("h1")).toContainText("Aureli Studio");
    await expect(page.locator("h2")).toContainText("Catalogue & stock");
  });

  test("Admin can view sellers list and manage listings review", async ({ page }) => {
    await loginAdmin(page);

    await page.goto("/admin/sellers");
    await page.waitForLoadState("domcontentloaded");

    // Verify admin seller management table
    await expect(page.locator("h1")).toContainText("Sellers");
    await expect(page.locator('text="Lotus Handlooms"')).toBeVisible();
  });
});
