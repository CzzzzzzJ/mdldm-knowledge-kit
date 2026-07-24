import { describe, expect, it } from "vitest";

import {
  createXorPayCallbackSignature,
  createXorPayRequestSignature,
  verifyXorPayCallback,
} from "@/providers/payment/xorpay";

describe("XorPay provider protocol", () => {
  it("signs payment requests in the documented field order", () => {
    expect(
      createXorPayRequestSignature({
        name: "全站年度会员",
        payType: "alipay",
        price: "499.00",
        orderNumber: "MKK-TEST-001",
        notifyUrl: "https://courses.example.com/api/payments/webhooks/xorpay",
        appSecret: "test-secret",
      }),
    ).toBe("2e6d600abc4d42f9f05b7d4c53a62746");
  });

  it("verifies callbacks and keeps exact minor-unit amounts", () => {
    const callback = {
      providerOrderId: "xor-provider-order-1",
      orderNumber: "MKK-TEST-001",
      paidPrice: "499.00",
      paidTime: "2026-07-24 12:30:00",
      appSecret: "test-secret",
    };
    const sign = createXorPayCallbackSignature(callback);
    const body = new URLSearchParams({
      aoid: callback.providerOrderId,
      order_id: callback.orderNumber,
      pay_price: callback.paidPrice,
      pay_time: callback.paidTime,
      transaction_id: "transaction-1",
      sign,
    }).toString();

    expect(verifyXorPayCallback(body, callback.appSecret)).toMatchObject({
      provider: "xorpay",
      orderNumber: callback.orderNumber,
      providerOrderId: callback.providerOrderId,
      amountInMinorUnits: 49_900,
      currency: "CNY",
      transactionId: "transaction-1",
    });
  });

  it("rejects callbacks with invalid signatures", () => {
    const body = new URLSearchParams({
      aoid: "xor-provider-order-1",
      order_id: "MKK-TEST-001",
      pay_price: "0.01",
      pay_time: "2026-07-24 12:30:00",
      sign: "invalid",
    }).toString();

    expect(() => verifyXorPayCallback(body, "test-secret")).toThrow(
      /签名无效/,
    );
  });
});
