import type {
  PaymentCheckout,
  PaymentProvider,
} from "@/providers/payment/port";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly supportedMethods = ["mock"] as const;

  async createPayment(input: {
    orderNumber: string;
  }): Promise<PaymentCheckout> {
    return {
      provider: this.name,
      providerOrderId: `mock:${input.orderNumber}`,
      mode: "mock",
      paymentUrl: null,
      qrContent: null,
      instructions: "这是开发环境 Mock 支付，不会产生真实扣款。",
      expiresAt: new Date(Date.now() + 30 * 60 * 1_000),
    };
  }
}
