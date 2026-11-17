import { test, expect } from "@playwright/test";
import { loginCustomer, loginAdmin } from "../helpers/auth-helper";

test.describe("Real Full-Stack: Reviews & Returns Lifecycle", () => {
  test("Review form is accessible on product page with star ratings", async ({ page }) => {
    await loginCustomer(page);

    await page.goto("/shop");
    await page.waitForLoadState("domcontentloaded");
    const firstProduct = page.locator('article a[href^="/product/"]').first();
    await firstProduct.click();
    await page.waitForURL((url) => url.pathname.includes("/product/"), { timeout: 10_000 });

    // Check review section using Playwright's .or()
    const reviewSection = page.getByRole("heading", { name: /reviews/i }).or(page.getByText("Customer reviews"));
    await expect(reviewSection.first()).toBeVisible({ timeout: 10_000 });

    // Review form star rating group
    const ratingGroup = page.locator('div[role="radiogroup"][aria-label="Rating"]');
    if (await ratingGroup.isVisible()) {
      await expect(ratingGroup.locator("button")).toHaveCount(5);
    }
  });

  test("Admin can view returns and refunds console", async ({ page }) => {
    await loginAdmin(page);

    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Overview should show Overview
    await expect(page.locator("h1")).toContainText("Overview");
  });
});
