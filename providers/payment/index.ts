import { getServerEnv } from "@/config/env";
import type { PaymentProvider } from "@/providers/payment/port";
import { ManualPaymentProvider } from "@/providers/payment/manual";
import { MockPaymentProvider } from "@/providers/payment/mock";
import { XorPayProvider } from "@/providers/payment/xorpay";

export function getPaymentProvider(): PaymentProvider {
  const env = getServerEnv();

  if (env.PAYMENT_PROVIDER === "manual") {
    return new ManualPaymentProvider(env.MANUAL_PAYMENT_INSTRUCTIONS);
  }

  if (env.PAYMENT_PROVIDER === "mock") {
    return new MockPaymentProvider();
  }

  if (!env.XORPAY_AID || !env.XORPAY_APP_SECRET) {
    throw new Error("XorPay Provider 配置不完整");
  }

  return new XorPayProvider({
    aid: env.XORPAY_AID,
    appSecret: env.XORPAY_APP_SECRET,
  });
}

export function getXorPayProvider(): XorPayProvider {
  const env = getServerEnv();
  if (!env.XORPAY_AID || !env.XORPAY_APP_SECRET) {
    throw new Error("XorPay Provider 配置不完整");
  }

  return new XorPayProvider({
    aid: env.XORPAY_AID,
    appSecret: env.XORPAY_APP_SECRET,
  });
}
