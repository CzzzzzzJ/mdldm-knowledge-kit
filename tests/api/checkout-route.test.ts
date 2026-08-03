import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckout: vi.fn(),
  isSiteLive: vi.fn(),
  getCurrentUser: vi.fn(),
  consumeRateLimit: vi.fn(),
  structuredLog: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  getServerEnv: () => ({
    NODE_ENV: "development",
    APP_URL: "http://knowledge.test",
  }),
}));

vi.mock("@/app/lib/commerce-service", () => {
  class CommerceError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "CommerceError";
    }
  }

  return {
    CommerceError,
    createCheckout: mocks.createCheckout,
  };
});

vi.mock("@/app/lib/site-initialization-service", () => ({
  isSiteLive: mocks.isSiteLive,
}));

vi.mock("@/app/lib/operations-service", () => ({
  structuredLog: mocks.structuredLog,
}));

vi.mock("@/providers/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/providers/rate-limit/mongodb", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

import { POST } from "@/app/api/checkout/route";
import { CommerceError } from "@/app/lib/commerce-service";

function checkoutRequest(
  body: unknown,
  origin = "http://knowledge.test",
): NextRequest {
  return new NextRequest("http://knowledge.test/api/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "knowledge.test",
      origin,
      "x-forwarded-for": "203.0.113.20",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    mocks.isSiteLive.mockResolvedValue(true);
    mocks.getCurrentUser.mockResolvedValue({
      id: "66aa11bb22cc33dd44ee5501",
      email: "buyer@example.com",
    });
  });

  it("rejects foreign origins and rate-limited requests before checkout", async () => {
    const foreign = await POST(
      checkoutRequest(
        { productId: "membership-yearly", paymentMethod: "manual" },
        "https://attacker.example",
      ),
    );
    expect(foreign.status).toBe(403);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();

    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 29,
    });
    const limited = await POST(
      checkoutRequest({
        productId: "membership-yearly",
        paymentMethod: "manual",
      }),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("29");
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("blocks checkout before launch and requires a verified session", async () => {
    mocks.isSiteLive.mockResolvedValue(false);
    const configuring = await POST(
      checkoutRequest({
        productId: "membership-yearly",
        paymentMethod: "manual",
      }),
    );
    expect(configuring.status).toBe(503);

    mocks.isSiteLive.mockResolvedValue(true);
    mocks.getCurrentUser.mockResolvedValue(null);
    const anonymous = await POST(
      checkoutRequest({
        productId: "membership-yearly",
        paymentMethod: "manual",
      }),
    );
    expect(anonymous.status).toBe(401);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("rejects client-controlled prices through a strict input schema", async () => {
    const response = await POST(
      checkoutRequest({
        productId: "membership-yearly",
        paymentMethod: "manual",
        amountInMinorUnits: 1,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("serializes a server-created checkout and never reads a client amount", async () => {
    mocks.createCheckout.mockResolvedValue({
      order: {
        id: "66aa11bb22cc33dd44ee5502",
        orderNumber: "MKK-API-001",
        status: "pending",
        fulfillmentStatus: "pending",
        amountInMinorUnits: 49_900,
        currency: "CNY",
      },
      checkout: {
        provider: "manual",
        providerOrderId: "manual:MKK-API-001",
        mode: "instructions",
        paymentUrl: null,
        qrContent: null,
        instructions: "请联系站长并提供订单号。",
        expiresAt: new Date("2026-08-04T00:00:00.000Z"),
      },
    });

    const response = await POST(
      checkoutRequest({
        productId: "membership-yearly",
        paymentMethod: "manual",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.createCheckout).toHaveBeenCalledWith({
      userId: "66aa11bb22cc33dd44ee5501",
      userEmail: "buyer@example.com",
      productId: "membership-yearly",
      paymentMethod: "manual",
    });
    await expect(response.json()).resolves.toMatchObject({
      order: { amountInMinorUnits: 49_900 },
      checkout: { expiresAt: "2026-08-04T00:00:00.000Z" },
    });
  });

  it("maps domain failures and hides unexpected provider errors", async () => {
    mocks.createCheckout.mockRejectedValueOnce(
      new CommerceError("PRODUCT_NOT_FOUND", "商品不存在或未启用"),
    );
    const missing = await POST(
      checkoutRequest({ productId: "missing", paymentMethod: "manual" }),
    );
    expect(missing.status).toBe(404);

    mocks.createCheckout.mockRejectedValueOnce(new Error("private-provider-detail"));
    const failed = await POST(
      checkoutRequest({
        productId: "membership-yearly",
        paymentMethod: "manual",
      }),
    );
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain("private-provider-detail");
    expect(mocks.structuredLog).toHaveBeenCalledWith(
      "error",
      "checkout_failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});
