import type {
  PaymentCheckout,
  PaymentProvider,
} from "@/providers/payment/port";

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";
  readonly supportedMethods = ["manual"] as const;

  constructor(private readonly instructions: string) {}

  async createPayment(input: {
    orderNumber: string;
  }): Promise<PaymentCheckout> {
    return {
      provider: this.name,
      providerOrderId: `manual:${input.orderNumber}`,
      mode: "instructions",
      paymentUrl: null,
      qrContent: null,
      instructions: this.instructions,
      expiresAt: null,
    };
  }
}
