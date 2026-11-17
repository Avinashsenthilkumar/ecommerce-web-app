export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: { name: string; url: string; email: string };
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
  };
  paths: Record<string, Record<string, any>>;
}

export const baseOpenApiSpec: OpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "subsel E-Commerce Platform API",
    version: "1.0.0",
    description:
      "Full REST API documentation for subsel — an end-to-end multi-vendor e-commerce platform and scan-based fulfilment logistics network.",
    contact: {
      name: "subsel Engineering",
      url: "http://localhost:3000",
      email: "support@subsel.demo",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local Development Server" },
  ],
  tags: [
    { name: "Authentication", description: "Customer, seller, and operations staff authentication" },
    { name: "Account", description: "Customer profile and address management" },
    { name: "Catalog", description: "Storefront products, search, categories, and reviews" },
    { name: "Cart", description: "Shopping bag, line items, quantity, and price calculation" },
    { name: "Orders", description: "Order placement, tracking timeline, and customer cancellation" },
    { name: "Returns", description: "Post-delivery reverse logistics and return requests" },
    { name: "Vendor", description: "Seller onboarding, catalogue management, and restock requests" },
    { name: "Admin", description: "Operations administration, order allocation, refunds, and settings" },
    { name: "Fulfilment", description: "Scan-based Warehouse, Hub, and Courier logistics network" },
    { name: "Media", description: "Asset and product image upload utilities" },
  ],
  components: {
    securitySchemes: {
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "subsel_session",
        description: "Session token stored in an httpOnly cookie upon login",
      },
    },
    schemas: {
      ApiResponseSuccess: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          data: { type: "object" },
        },
        required: ["ok", "data"],
      },
      ApiResponseError: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: false },
          error: { type: "string", example: "Invalid request parameters." },
        },
        required: ["ok", "error"],
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Customer Registration",
        description: "Creates a new customer account with name, email, phone, and password (min 8 chars).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fullName: { type: "string", example: "Priya Narayanan" },
                  phone: { type: "string", example: "9840012345" },
                  email: { type: "string", format: "email", example: "priya@subsel.demo" },
                  password: { type: "string", format: "password", minLength: 8, example: "Subsel@123" },
                },
                required: ["fullName", "phone", "email", "password"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Customer registered and signed in" },
          "409": { description: "Email already registered" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Multi-Portal Login",
        description: "Authenticates customer, vendor, or staff members and issues an httpOnly session cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email", example: "priya@subsel.demo" },
                  password: { type: "string", format: "password", example: "Subsel@123" },
                  portal: { type: "string", enum: ["customer", "vendor", "staff"], example: "customer" },
                },
                required: ["email", "password", "portal"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Authentication successful, returns target home route" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Sign Out",
        description: "Destroys active session hash in database and clears session cookie.",
        security: [{ CookieAuth: [] }],
        responses: {
          "200": { description: "Successfully signed out" },
        },
      },
    },
    "/api/account/addresses": {
      get: {
        tags: ["Account"],
        summary: "List Saved Addresses",
        description: "Returns all saved shipping addresses for the logged-in customer.",
        security: [{ CookieAuth: [] }],
        responses: {
          "200": { description: "List of customer addresses" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Account"],
        summary: "Create Shipping Address",
        description: "Adds a new delivery address to the customer's address book.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Priya Narayanan" },
                  phone: { type: "string", example: "9840012345" },
                  line1: { type: "string", example: "14, 3rd Cross Street" },
                  line2: { type: "string", example: "Vijaya Nagar" },
                  city: { type: "string", example: "Chennai" },
                  state: { type: "string", example: "Tamil Nadu" },
                  pincode: { type: "string", example: "600042" },
                  isDefault: { type: "boolean", example: true },
                },
                required: ["name", "phone", "line1", "city", "state", "pincode"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Address successfully saved" },
          "422": { description: "Validation error (invalid pincode/phone)" },
        },
      },
    },
    "/api/account/addresses/{id}": {
      post: {
        tags: ["Account"],
        summary: "Manage Address Action",
        description: "Performs actions on an existing address: set as default or delete.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["default", "delete"], example: "default" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Address updated" },
          "401": { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Account"],
        summary: "Update Address Details",
        description: "Updates fields of an existing address.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  address: { type: "object" },
                  isDefault: { type: "boolean" },
                },
                required: ["address"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Address updated successfully" },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Catalog"],
        summary: "Search & Filter Catalog Products",
        description: "Returns paginated products filtered by department, query, brand, price, and rating.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search keyword" },
          { name: "category", in: "query", schema: { type: "string" }, description: "Category slug" },
          { name: "sort", in: "query", schema: { type: "string" }, description: "Sort option: featured | price-asc | price-desc | newest | top-rated" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": { description: "Paginated list of active products" },
        },
      },
    },
    "/api/wishlist": {
      get: {
        tags: ["Catalog"],
        summary: "Get Customer Wishlist",
        description: "Returns an array of product IDs saved to the customer's wishlist.",
        security: [{ CookieAuth: [] }],
        responses: {
          "200": { description: "List of wishlist product IDs" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Catalog"],
        summary: "Toggle Wishlist Product",
        description: "Adds or removes a product from the customer's wishlist.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { productId: { type: "string" } },
                required: ["productId"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Returns { saved: boolean }" },
        },
      },
    },
    "/api/reviews": {
      post: {
        tags: ["Catalog"],
        summary: "Submit Product Review",
        description: "Submits a verified buyer rating (1-5 stars) and comment for a delivered product.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                  comment: { type: "string", example: "Superb fabric quality and fit!" },
                },
                required: ["productId", "rating"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Review posted successfully" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/cart": {
      get: {
        tags: ["Cart"],
        summary: "Get Bag Contents & Pricing Breakdown",
        description: "Calculates subtotal, demo discount (5%), GST (18%), and shipping fee.",
        security: [{ CookieAuth: [] }],
        responses: {
          "200": { description: "Bag line items and totals breakdown" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Cart"],
        summary: "Add Variant to Bag",
        description: "Adds a product variant with specified quantity to the customer's bag.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  variantId: { type: "string" },
                  quantity: { type: "integer", minimum: 1, maximum: 20, default: 1 },
                },
                required: ["variantId"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Item added, returns total item count" },
          "409": { description: "Stock exceeded" },
        },
      },
      patch: {
        tags: ["Cart"],
        summary: "Update Bag Item Quantity",
        description: "Updates line item quantity (passing 0 removes the item).",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  itemId: { type: "string" },
                  quantity: { type: "integer", minimum: 0, maximum: 20 },
                },
                required: ["itemId", "quantity"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Quantity updated" },
        },
      },
    },
    "/api/cart/save": {
      post: {
        tags: ["Cart"],
        summary: "Save Bag Item For Later",
        description: "Moves an item from the bag to the customer's wishlist.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { itemId: { type: "string" } },
                required: ["itemId"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Item moved to wishlist" },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "List Customer Orders",
        description: "Returns order history with tracking timeline and split parcels.",
        security: [{ CookieAuth: [] }],
        responses: {
          "200": { description: "List of customer orders" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Checkout / Place Order",
        description: "Places an order from bag items with chosen address and payment method.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  address: { type: "object" },
                  paymentMethod: { type: "string", enum: ["UPI", "CARD", "NETBANKING", "COD"] },
                },
                required: ["address", "paymentMethod"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Order created, returns { orderNumber: string }" },
          "400": { description: "Empty bag or invalid address" },
        },
      },
    },
    "/api/orders/{orderNumber}": {
      get: {
        tags: ["Orders"],
        summary: "Get Order Details",
        description: "Fetches full order status, shipment parcels, QR codes, and delivery OTP.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detailed order information" },
          "404": { description: "Order not found" },
        },
      },
    },
    "/api/orders/{orderNumber}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel Customer Order",
        description: "Cancels an order before stock allocation and initiates automatic refund.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Order cancelled and refund queued" },
        },
      },
    },
    "/api/returns": {
      post: {
        tags: ["Returns"],
        summary: "Request Item Return",
        description: "Initiates a return for a delivered item within the 7-day return window.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  orderItemId: { type: "string" },
                  quantity: { type: "integer", minimum: 1 },
                  reason: { type: "string", example: "Size or fit issue" },
                  comment: { type: "string" },
                },
                required: ["orderItemId", "quantity", "reason"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Return request submitted" },
        },
      },
    },
    "/api/vendor/register": {
      post: {
        tags: ["Vendor"],
        summary: "Seller Onboarding Application",
        description: "Submits a new seller application with status PENDING admin review.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  businessName: { type: "string", example: "Artisan Silks" },
                  fullName: { type: "string", example: "Lakshmi Sundaram" },
                  email: { type: "string", format: "email", example: "artisan@subsel.demo" },
                  phone: { type: "string", example: "9894055120" },
                  password: { type: "string", minLength: 8, example: "Subsel@123" },
                  gstin: { type: "string", example: "33AAFCL9012M1Z8" },
                  pickupAddress: { type: "string", example: "12, Handloom St, Chennai" },
                  storeDescription: { type: "string", example: "Handwoven sarees and apparel" },
                },
                required: ["businessName", "fullName", "email", "phone", "password", "pickupAddress", "storeDescription"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Vendor registered with status PENDING" },
        },
      },
    },
    "/api/vendor/products": {
      post: {
        tags: ["Vendor"],
        summary: "Create New Product Listing",
        description: "Creates a product listing with variants awaiting admin review.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "200": { description: "Product created with status PENDING_REVIEW" },
        },
      },
    },
    "/api/vendor/products/{id}": {
      post: {
        tags: ["Vendor"],
        summary: "Resubmit Product Listing for Review",
        description: "Resubmits a rejected product listing back to admin review.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["resubmit"] },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Listing resubmitted successfully" },
          "400": { description: "Invalid state for resubmission" },
          "403": { description: "Unauthorized seller" },
        },
      },
    },
    "/api/vendor/restock": {
      post: {
        tags: ["Vendor"],
        summary: "Restock Variant Inventory",
        description: "Adds available stock units to a fulfilment centre warehouse for a SKU.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sku: { type: "string", example: "AUR-SHIRT-M" },
                  quantity: { type: "integer", minimum: 1, example: 25 },
                  warehouseId: { type: "string" },
                },
                required: ["sku", "quantity", "warehouseId"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Stock added and logged in stock movements" },
        },
      },
    },
    "/api/vendor/analytics/report": {
      get: {
        tags: ["Vendor"],
        summary: "Download Seller Sales Report",
        description: "Exports sales, orders, units sold, and payout estimates as CSV.",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "period", in: "query", required: true, schema: { type: "string", enum: ["day", "month", "year"] } },
          { name: "year", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "CSV file download" },
        },
      },
    },
    "/api/admin/overview": {
      get: {
        tags: ["Admin"],
        summary: "Operations Overview Metrics",
        description: "Returns real-time task queues (orders awaiting confirmation, listings to review, pending refunds).",
        security: [{ CookieAuth: [] }],
        responses: {
          "200": { description: "Admin dashboard stats and queues" },
          "403": { description: "Admin role required" },
        },
      },
    },
    "/api/admin/orders/{id}": {
      post: {
        tags: ["Admin"],
        summary: "Manage Order Lifecycle Action",
        description: "Confirms order payment, allocates stock to nearest warehouse, or cancels order.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["confirm", "allocate", "cancel"], example: "confirm" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Order action executed" },
        },
      },
    },
    "/api/admin/sellers/{id}": {
      post: {
        tags: ["Admin"],
        summary: "Seller Approval & Suspension",
        description: "Approve, reject, suspend, or reinstate a seller account.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["approve", "reject", "suspend", "reinstate"], example: "approve" },
                  reason: { type: "string" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Seller status updated" },
        },
      },
    },
    "/api/admin/listings/{id}": {
      post: {
        tags: ["Admin"],
        summary: "Product Listing Review",
        description: "Approve & publish a seller listing or send it back with review notes.",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["approve", "reject"], example: "approve" },
                  reason: { type: "string" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Listing published to storefront" },
        },
      },
    },
    "/api/admin/returns/{id}": {
      post: {
        tags: ["Admin"],
        summary: "Approve or Reject Return Request",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["approve", "reject"] },
                  note: { type: "string" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: { "200": { description: "Return status updated" } },
      },
    },
    "/api/admin/refunds/{id}": {
      post: {
        tags: ["Admin"],
        summary: "Process / Advance Refund Stage",
        security: [{ CookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Refund advanced to next stage" } },
      },
    },
    "/api/admin/settings": {
      get: {
        tags: ["Admin"],
        summary: "Get Store Rules & Tax Settings",
        security: [{ CookieAuth: [] }],
        responses: { "200": { description: "Current store configuration" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Update Store Settings",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Store settings saved" } },
      },
    },
    "/api/admin/analytics/report": {
      get: {
        tags: ["Admin"],
        summary: "Download Platform Sales Report",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "period", in: "query", required: true, schema: { type: "string", enum: ["day", "month", "year"] } },
          { name: "year", in: "query", schema: { type: "integer" } },
          { name: "format", in: "query", schema: { type: "string", enum: ["json", "csv"] } },
        ],
        responses: { "200": { description: "Platform sales report" } },
      },
    },
    "/api/warehouse": {
      get: {
        tags: ["Fulfilment"],
        summary: "Warehouse Pick & Pack Dashboard",
        security: [{ CookieAuth: [] }],
        responses: { "200": { description: "Shipments waiting for pick/pack" } },
      },
      post: {
        tags: ["Fulfilment"],
        summary: "Warehouse Scan / Pack Action",
        description: "Scans item SKU barcode, confirms packing, prints QR label, or hands over to first hub.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["scan", "pack", "handover"], example: "scan" },
                  shipmentId: { type: "string" },
                  sku: { type: "string" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: { "200": { description: "Barcode scan accepted" } },
      },
    },
    "/api/hub": {
      get: {
        tags: ["Fulfilment"],
        summary: "Hub Transit State",
        security: [{ CookieAuth: [] }],
        responses: { "200": { description: "Parcels at sorting / delivery hub" } },
      },
      post: {
        tags: ["Fulfilment"],
        summary: "Hub Scanner Intake / Sort / Dispatch",
        description: "Scans parcel QR: 1st scan = received, 2nd = sorted, 3rd = dispatched / rider assigned.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { scan: { type: "string", example: "PKG-20260922-0001-FC-CHN" } },
                required: ["scan"],
              },
            },
          },
        },
        responses: { "200": { description: "Transit leg updated" } },
      },
    },
    "/api/courier": {
      get: {
        tags: ["Fulfilment"],
        summary: "Courier Delivery Runsheet",
        security: [{ CookieAuth: [] }],
        responses: { "200": { description: "Active deliveries, return pickups, and cash to collect" } },
      },
      post: {
        tags: ["Fulfilment"],
        summary: "Courier Delivery & POD",
        description: "Confirms delivery by scanning parcel QR, verifying 4-digit customer OTP, and recording COD cash.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  action: { type: "string", enum: ["deliver", "pickup", "fail"] },
                  shipmentId: { type: "string" },
                  otp: { type: "string", example: "4412" },
                  cashCollected: { type: "number" },
                },
                required: ["action"],
              },
            },
          },
        },
        responses: { "200": { description: "Parcel marked DELIVERED" } },
      },
    },
    "/api/cloudinary/upload": {
      post: {
        tags: ["Media"],
        summary: "Generate Cloudinary Asset Signature",
        description: "Generates signed params for uploading product photos and media assets.",
        security: [{ CookieAuth: [] }],
        responses: { "200": { description: "Signed upload timestamp and signature" } },
      },
    },
  },
};
