import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectMongo: vi.fn(),
  existsProduct: vi.fn(),
  createProduct: vi.fn(),
  findProduct: vi.fn(),
  createOrder: vi.fn(),
  createOrderItem: vi.fn(),
  createPayment: vi.fn(),
}));

vi.mock("@/config/products.config", () => ({
  productsConfig: [
    {
      id: "membership-seed",
      title: "配置文件种子商品",
      description: "该价格只用于首次创建。",
      price: { amountInMinorUnits: 1, currency: "CNY" },
      entitlement: {
        type: "membership",
        targetId: null,
        durationDays: 1,
      },
      active: true,
    },
  ],
}));

vi.mock("@/config/env", () => ({
  getServerEnv: () => ({
    APP_URL: "http://localhost:3000",
    XORPAY_NOTIFY_URL: null,
  }),
}));

vi.mock("@/config/features.config", () => ({
  getFeaturesConfig: () => ({
    membership: true,
    singleCoursePurchase: true,
  }),
}));

vi.mock("@/app/lib/operations-service", () => ({
  reportOperationalFailure: vi.fn(),
  resolveOperationalFailures: vi.fn(),
}));

vi.mock("@/providers/database/mongodb/connection", () => ({
  connectMongo: mocks.connectMongo,
}));

vi.mock("@/providers/database/mongodb/models/commerce", () => ({
  ProductModel: {
    exists: mocks.existsProduct,
    create: mocks.createProduct,
    findOne: mocks.findProduct,
  },
  OrderModel: {
    create: mocks.createOrder,
  },
  OrderItemModel: {
    create: mocks.createOrderItem,
  },
  PaymentEventModel: {},
}));

vi.mock("@/providers/database/mongodb/models/entitlement", () => ({
  EntitlementModel: {},
}));

vi.mock("@/providers/database/mongodb/models/series", () => ({
  CourseModel: {},
  SeriesModel: {},
}));

vi.mock("@/providers/payment", () => ({
  getPaymentProvider: () => ({
    name: "mock",
    supportedMethods: ["mock"],
    createPayment: mocks.createPayment,
  }),
}));

import { createCheckout } from "@/app/lib/commerce-service";

describe("checkout product source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existsProduct.mockResolvedValue({ _id: "seed-exists" });
  });

  it("uses the database Product for price and entitlement snapshots", async () => {
    const databaseProduct = {
      _id: { toString: () => "66aa11bb22cc33dd44ee5501" },
      sku: "admin-course-product",
      title: "后台定价课程",
      amountInMinorUnits: 12_700,
      currency: "CNY",
      entitlementType: "course",
      entitlementTargetId: "66aa11bb22cc33dd44ee5502",
      entitlementDurationDays: null,
      active: true,
    };
    const order = {
      _id: { toString: () => "66aa11bb22cc33dd44ee5503" },
      orderNumber: "MKK-TEST",
      status: "pending",
      fulfillmentStatus: "pending",
      providerOrderId: null as string | null,
      expiresAt: null as Date | null,
      save: vi.fn(),
    };

    mocks.findProduct.mockResolvedValue(databaseProduct);
    mocks.createOrder.mockResolvedValue(order);
    mocks.createOrderItem.mockResolvedValue({});
    mocks.createPayment.mockResolvedValue({
      provider: "mock",
      providerOrderId: "mock:MKK-TEST",
      mode: "mock",
      paymentUrl: null,
      qrContent: null,
      instructions: "测试支付",
      expiresAt: null,
    });

    await createCheckout({
      userId: "66aa11bb22cc33dd44ee5504",
      userEmail: "creator@example.com",
      productId: "admin-course-product",
      paymentMethod: "mock",
    });

    expect(mocks.findProduct).toHaveBeenCalledWith({
      sku: "admin-course-product",
      active: true,
    });
    expect(mocks.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amountInMinorUnits: 12_700,
        currency: "CNY",
      }),
    );
    expect(mocks.createOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: "admin-course-product",
        title: "后台定价课程",
        unitAmountInMinorUnits: 12_700,
        totalAmountInMinorUnits: 12_700,
        entitlementType: "course",
        entitlementTargetId: "66aa11bb22cc33dd44ee5502",
        entitlementDurationDays: null,
      }),
    );
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        productTitle: "后台定价课程",
        amountInMinorUnits: 12_700,
        currency: "CNY",
      }),
    );
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("creates a missing configured SKU as a complete Product document", async () => {
    mocks.existsProduct.mockResolvedValue(null);
    mocks.createProduct.mockResolvedValue({});
    mocks.findProduct.mockResolvedValue(null);

    await expect(
      createCheckout({
        userId: "66aa11bb22cc33dd44ee5504",
        userEmail: "creator@example.com",
        productId: "missing-product",
        paymentMethod: "mock",
      }),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });

    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: "membership-seed",
        amountInMinorUnits: 1,
        entitlementType: "membership",
      }),
    );
  });
});
