import type {
  Currency,
  PaymentMethod,
  PaymentProviderName,
} from "@/modules/commerce";

export interface CreatePaymentInput {
  orderNumber: string;
  customerReference: string;
  productTitle: string;
  amountInMinorUnits: number;
  currency: Currency;
  method: PaymentMethod;
  notifyUrl: string;
}

export interface PaymentCheckout {
  provider: PaymentProviderName;
  providerOrderId: string;
  mode: "instructions" | "mock" | "payment_url";
  paymentUrl: string | null;
  qrContent: string | null;
  instructions: string | null;
  expiresAt: Date | null;
}

export interface VerifiedPayment {
  provider: PaymentProviderName;
  eventId: string;
  eventType: string;
  orderNumber: string;
  providerOrderId: string;
  amountInMinorUnits: number;
  currency: Currency;
  transactionId: string | null;
  occurredAt: Date;
  payloadDigest: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly supportedMethods: readonly PaymentMethod[];
  createPayment(input: CreatePaymentInput): Promise<PaymentCheckout>;
}
