import { Page } from "@playwright/test";

export const MOCK_USER_CUSTOMER = {
  id: "mock-user-123",
  email: "mock.customer@subsel.demo",
  fullName: "Mock Customer",
  phone: "9876543210",
  role: "CUSTOMER",
  status: "ACTIVE",
};

export const MOCK_PRODUCT = {
  id: "prod-mock-1",
  title: "Aureli Pure Linen Shirt",
  slug: "aureli-pure-linen-shirt",
  brand: { id: "brand-1", name: "Aureli Studio" },
  category: { id: "cat-1", name: "Shirts", slug: "shirts" },
  mrp: 3499,
  sellingPrice: 2299,
  images: [{ url: "/images/linen-shirt.jpg", altText: "Aureli Pure Linen Shirt" }],
  variants: [
    { id: "var-1", sku: "AUR-SHIRT-M", size: "M", color: "White", inStock: true },
    { id: "var-2", sku: "AUR-SHIRT-L", size: "L", color: "White", inStock: true },
  ],
};

export const MOCK_CART_TOTALS = {
  subtotal: 2299,
  discountTotal: 115, // 5%
  taxable: 2184,
  taxTotal: 393, // 18%
  shippingFee: 0, // Free shipping (>= 999)
  grandTotal: 2577,
  itemCount: 1,
};

export async function setupMockCustomerAuth(page: Page) {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, home: "/", user: MOCK_USER_CUSTOMER }),
    });
  });
}

export async function setupMockProducts(page: Page, products = [MOCK_PRODUCT]) {
  await page.route("**/api/products*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products,
        pagination: { page: 1, limit: 12, total: products.length, totalPages: 1 },
      }),
    });
  });
}

export async function setupMockCart(page: Page, items: any[] = [], totals = MOCK_CART_TOTALS) {
  await page.route("**/api/cart", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items, totals }),
      });
    } else if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, itemId: "item-new-1" }),
      });
    } else if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function setupMockCheckoutSuccess(page: Page, orderNumber = "ORD-20261117-009999") {
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: "ord-mock-id",
            orderNumber,
            status: "PLACED",
            paymentMethod: "COD",
            paymentStatus: "PENDING",
            grandTotal: 2577,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function setupMockNetworkFailure(page: Page, urlPattern: string, status = 500) {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "Simulated internal server error. Please try again later." }),
    });
  });
}
