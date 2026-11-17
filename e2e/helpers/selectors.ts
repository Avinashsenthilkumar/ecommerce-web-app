export const SELECTORS = {
  // Auth Form Selectors
  auth: {
    emailInput: '#email',
    passwordInput: '#password',
    fullNameInput: '#fullName',
    phoneInput: '#phone',
    submitButton: 'button[type="submit"], form button.btn-primary',
    errorAlert: 'form p[role="alert"]',
    togglePassword: 'button[aria-label="Show password"], button[aria-label="Hide password"]',
  },

  // Storefront & Navigation
  nav: {
    brandLogo: 'a:has-text("subsel")',
    searchForm: 'input[placeholder*="Search"]',
    cartButton: 'a[href="/cart"], button:has-text("Bag")',
    wishlistButton: 'a[href="/wishlist"], button:has-text("Wishlist")',
    accountMenu: 'button:has-text("Account"), a[href="/account"]',
    mobileTabBar: 'nav.fixed.bottom-0, nav[aria-label="Mobile navigation"]',
    mobileMenuButton: 'button[aria-label="Open menu"], button[aria-label="Toggle menu"]',
  },

  // Catalog & Product Page
  shop: {
    productCard: 'article, a[href^="/product/"]',
    filterCategory: 'input[name="category"], select[name="category"]',
    filterBrand: 'input[name="brand"], select[name="brand"]',
    sortSelect: 'select[name="sort"], select#sort',
    searchInput: 'input[type="search"], input[name="q"], input[placeholder*="Search"]',
  },

  // Product Detail Page (PDP)
  product: {
    title: 'h1',
    price: '[data-testid="price"], span:has-text("₹")',
    addToCartBtn: 'button:has-text("Add to Bag"), button:has-text("Add to cart")',
    buyNowBtn: 'button:has-text("Buy now"), button:has-text("Buy Now")',
    wishlistHeartBtn: 'button[aria-label*="wishlist"], button[aria-label*="Wishlist"]',
    reviewForm: 'form:has-text("Write a review"), form:has(textarea)',
    starRating: 'button[aria-label*="star"], [data-rating]',
    reviewComment: 'textarea[name="comment"], textarea#comment',
    submitReviewBtn: 'button:has-text("Submit review")',
  },

  // Cart & Checkout
  cart: {
    emptyCartNotice: 'text="Your bag is empty"',
    itemRow: '[data-testid="cart-item"], div.cart-item',
    quantityIncrease: 'button[aria-label="Increase quantity"], button:has-text("+")',
    quantityDecrease: 'button[aria-label="Decrease quantity"], button:has-text("-")',
    removeItemBtn: 'button:has-text("Remove")',
    saveForLaterBtn: 'button:has-text("Save for later")',
    subtotal: 'text="Subtotal"',
    gstLine: 'text="GST"',
    shippingLine: 'text="Shipping"',
    checkoutBtn: 'button:has-text("Checkout"), button:has-text("Place order"), button:has-text("Place Order")',
    addressRadio: 'input[type="radio"][name="address"]',
    paymentMethodCod: 'input[value="COD"], label:has-text("Cash on Delivery"), label:has-text("COD")',
    paymentMethodUpi: 'input[value="UPI"], label:has-text("UPI")',
    paymentMethodCard: 'input[value="CARD"], label:has-text("Card")',
  },

  // Operations Consoles
  ops: {
    scanInput: 'input[name="scan"], input[placeholder*="Scan"], input#scan',
    submitScanBtn: 'button:has-text("Scan"), button[type="submit"]',
    confirmPackedBtn: 'button:has-text("Confirm packed"), button:has-text("Pack")',
    printQrBtn: 'button:has-text("Generate QR"), button:has-text("Print QR")',
    deliverOtpInput: 'input[name="otp"], input#otp',
    deliverSubmitBtn: 'button:has-text("Mark delivered"), button:has-text("Deliver")',
  },
};
