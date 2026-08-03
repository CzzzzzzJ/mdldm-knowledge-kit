import { describe, expect, it } from "vitest";

import { ManualPaymentProvider } from "@/providers/payment/manual";
import { MockPaymentProvider } from "@/providers/payment/mock";
import type {
  CreatePaymentInput,
  PaymentProvider,
} from "@/providers/payment/port";

const baseInput: CreatePaymentInput = {
  orderNumber: "MKK-CONTRACT-001",
  customerReference: "fictional-buyer@example.com",
  productTitle: "虚构年度会员",
  amountInMinorUnits: 49_900,
  currency: "CNY",
  method: "manual",
  notifyUrl: "https://example.invalid/api/payments/webhook",
};

describe("payment provider contract", () => {
  it("returns explicit offline instructions without pretending payment succeeded", async () => {
    const provider: PaymentProvider = new ManualPaymentProvider(
      "请联系站长并提供订单号。",
    );
    const checkout = await provider.createPayment(baseInput);

    expect(provider.supportedMethods).toEqual(["manual"]);
    expect(checkout).toMatchObject({
      provider: "manual",
      providerOrderId: "manual:MKK-CONTRACT-001",
      mode: "instructions",
      paymentUrl: null,
      qrContent: null,
      instructions: "请联系站长并提供订单号。",
      expiresAt: null,
    });
  });

  it("keeps automatic test payment isolated behind the mock method", async () => {
    const provider: PaymentProvider = new MockPaymentProvider();
    const checkout = await provider.createPayment({
      ...baseInput,
      method: "mock",
    });

    expect(provider.supportedMethods).toEqual(["mock"]);
    expect(checkout).toMatchObject({
      provider: "mock",
      providerOrderId: "mock:MKK-CONTRACT-001",
      mode: "mock",
      paymentUrl: null,
      qrContent: null,
    });
    expect(checkout.instructions).toContain("不会产生真实扣款");
    expect(checkout.expiresAt?.getTime()).toBeGreaterThan(Date.now());
  });
});
