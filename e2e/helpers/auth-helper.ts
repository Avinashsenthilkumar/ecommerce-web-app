import { Page, expect } from "@playwright/test";
import { SELECTORS } from "./selectors";

export const DEMO_CREDENTIALS = {
  customer: { email: "priya@subsel.demo", password: "Subsel@123" },
  admin: { email: "admin@subsel.demo", password: "Subsel@123" },
  vendorApproved: { email: "aureli@subsel.demo", password: "Subsel@123" },
  vendorPending: { email: "lotus@subsel.demo", password: "Subsel@123" },
  warehouse: { email: "floor@subsel.demo", password: "Subsel@123" },
  hub: { email: "hub@subsel.demo", password: "Subsel@123" },
  courier: { email: "ravi@subsel.demo", password: "Subsel@123" },
};

export async function loginAs(
  page: Page,
  email: string,
  password = "Subsel@123",
  portal: "customer" | "vendor" | "staff" = "customer",
  options?: { expectFail?: boolean }
) {
  const loginPath =
    portal === "vendor" ? "/vendor/login" : portal === "staff" ? "/staff/login" : "/login";

  await page.goto(loginPath);
  await page.waitForLoadState("domcontentloaded");

  await page.fill(SELECTORS.auth.emailInput, email);
  await page.fill(SELECTORS.auth.passwordInput, password);
  await page.click(SELECTORS.auth.submitButton);

  if (options?.expectFail) {
    await expect(page.locator(SELECTORS.auth.errorAlert)).toBeVisible({ timeout: 10_000 });
  } else {
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
  }
}

export async function loginCustomer(page: Page) {
  await loginAs(page, DEMO_CREDENTIALS.customer.email, DEMO_CREDENTIALS.customer.password, "customer");
}

export async function loginAdmin(page: Page) {
  await loginAs(page, DEMO_CREDENTIALS.admin.email, DEMO_CREDENTIALS.admin.password, "staff");
}

export async function loginVendor(page: Page, pending = false) {
  const creds = pending ? DEMO_CREDENTIALS.vendorPending : DEMO_CREDENTIALS.vendorApproved;
  await loginAs(page, creds.email, creds.password, "vendor");
}

export async function loginWarehouse(page: Page) {
  await loginAs(page, DEMO_CREDENTIALS.warehouse.email, DEMO_CREDENTIALS.warehouse.password, "staff");
}

export async function loginHub(page: Page) {
  await loginAs(page, DEMO_CREDENTIALS.hub.email, DEMO_CREDENTIALS.hub.password, "staff");
}

export async function loginCourier(page: Page) {
  await loginAs(page, DEMO_CREDENTIALS.courier.email, DEMO_CREDENTIALS.courier.password, "staff");
}

export async function logout(page: Page) {
  await page.request.post("/api/auth/logout");
  await page.context().clearCookies();
  await page.goto("/");
}
