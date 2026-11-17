import { test, expect } from "@playwright/test";

test.describe("UI & Responsive: Mobile Tab Bar & Navigation", () => {
  test("Mobile bottom tab bar is visible on mobile viewports", async ({ page }) => {
    // If viewport is desktop width (>= 1024), it is hidden. On mobile (< 1024), it is visible.
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const viewportSize = page.viewportSize();
    const navTabBar = page.locator('nav[aria-label="App navigation"]');

    if (viewportSize && viewportSize.width < 1024) {
      await expect(navTabBar).toBeVisible();

      // Check all 5 tabs exist
      await expect(navTabBar.locator('a[href="/"]')).toBeVisible();
      await expect(navTabBar.locator('a[href*="/shop"]')).toBeVisible();
      await expect(navTabBar.locator('a[href="/wishlist"]')).toBeVisible();
      await expect(navTabBar.locator('a[href="/cart"]')).toBeVisible();
      await expect(navTabBar.locator('a[href="/account"]')).toBeVisible();
    } else {
      await expect(navTabBar).toBeHidden();
    }
  });

  test("Interactive touch target dimensions meet accessibility standards (>= 44px height)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 1024) {
      const navLinks = page.locator('nav[aria-label="App navigation"] a');
      const count = await navLinks.count();

      for (let i = 0; i < count; i++) {
        const box = await navLinks.nth(i).boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});
