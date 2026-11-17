import { test as base, expect } from "@playwright/test";
import { loginCustomer, loginAdmin, loginVendor } from "../helpers/auth-helper";

type CustomFixtures = {
  customerPage: import("@playwright/test").Page;
  adminPage: import("@playwright/test").Page;
  vendorPage: import("@playwright/test").Page;
};

export const test = base.extend<CustomFixtures>({
  customerPage: async ({ page }, use) => {
    await loginCustomer(page);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await loginAdmin(page);
    await use(page);
  },
  vendorPage: async ({ page }, use) => {
    await loginVendor(page);
    await use(page);
  },
});

export { expect };
