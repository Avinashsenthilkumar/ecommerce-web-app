import { test, expect } from "@playwright/test";
import { setupMockNetworkFailure } from "../helpers/mock-routes";
import { SELECTORS } from "../helpers/selectors";

test.describe("Frontend Mock: Error States & Resilience", () => {
  test("Displays error banner when login API throws 500 internal server error", async ({ page }) => {
    await setupMockNetworkFailure(page, "**/api/auth/login", 500);

    await page.goto("/login");
    await page.fill(SELECTORS.auth.emailInput, "user@test.com");
    await page.fill(SELECTORS.auth.passwordInput, "AnyPassword123");
    await page.click(SELECTORS.auth.submitButton);

    const alert = page.locator("form p[role='alert']");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Simulated internal server error");
  });

  test("Registration handles 409 conflict when email already exists", async ({ page }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "An account with this email already exists." }),
      });
    });

    await page.goto("/register");
    await page.fill(SELECTORS.auth.fullNameInput, "Duplicate User");
    await page.fill(SELECTORS.auth.phoneInput, "9876543210");
    await page.fill(SELECTORS.auth.emailInput, "existing@subsel.demo");
    await page.fill(SELECTORS.auth.passwordInput, "SecurePassword123");
    await page.click(SELECTORS.auth.submitButton);

    const alert = page.locator("form p[role='alert']");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("already exists");
  });

  test("Not found (404) page displays friendly guidance for invalid URL", async ({ page }) => {
    await page.goto("/non-existent-route-xyz-404");
    await expect(page.locator("h1")).toContainText("This page is not on the shelf.");
    await expect(page.locator('a[href="/shop?category=all"]')).toBeVisible();
  });
});
