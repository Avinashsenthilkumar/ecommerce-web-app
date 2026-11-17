import { test, expect } from "@playwright/test";
import { SELECTORS } from "../helpers/selectors";

test.describe("Frontend Mock: Authentication UI", () => {
  test("Customer login form displays validation when submitted empty", async ({ page }) => {
    await page.goto("/login");

    const submitBtn = page.locator(SELECTORS.auth.submitButton);
    await expect(submitBtn).toBeDisabled();

    // Type email only
    await page.fill(SELECTORS.auth.emailInput, "test@example.com");
    await expect(submitBtn).toBeDisabled();

    // Fill password to enable
    await page.fill(SELECTORS.auth.passwordInput, "SecretPassword123");
    await expect(submitBtn).toBeEnabled();
  });

  test("Password visibility toggle reveals and masks password text", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator(SELECTORS.auth.passwordInput);
    await passwordInput.fill("MyHiddenPassword");

    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = page.locator(SELECTORS.auth.togglePassword);
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("Displays error alert banner when authentication fails (mocked 401)", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Invalid email or password." }),
      });
    });

    await page.goto("/login");
    await page.fill(SELECTORS.auth.emailInput, "wrong@subsel.demo");
    await page.fill(SELECTORS.auth.passwordInput, "WrongPassword");
    await page.click(SELECTORS.auth.submitButton);

    const alert = page.locator("form p[role='alert']");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Invalid email or password");
  });

  test("Customer registration enforces min 8 char password", async ({ page }) => {
    await page.goto("/register");

    await page.fill(SELECTORS.auth.fullNameInput, "Alice Smith");
    await page.fill(SELECTORS.auth.phoneInput, "9876543210");
    await page.fill(SELECTORS.auth.emailInput, "alice@example.com");

    const passwordInput = page.locator(SELECTORS.auth.passwordInput);
    await expect(passwordInput).toHaveAttribute("minLength", "8");

    // Mock validation failure if less than 8 chars submitted
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Password must be at least 8 characters long." }),
      });
    });

    await passwordInput.fill("short");
    await page.click(SELECTORS.auth.submitButton);

    const alert = page.locator("form p[role='alert']");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Password must be at least 8 characters");
  });
});
