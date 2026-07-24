import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import { z } from "zod";

import {
  formatMinorUnits,
  parseCnyAmountToMinorUnits,
} from "@/modules/commerce";
import type {
  CreatePaymentInput,
  PaymentCheckout,
  PaymentProvider,
  VerifiedPayment,
} from "@/providers/payment/port";

const xorPayResponseSchema = z
  .object({
    status: z.string(),
    aoid: z.string().min(1).optional(),
    expires_in: z.coerce.number().int().positive().optional(),
    info: z
      .object({
        qr: z.string().min(1),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export function createXorPayRequestSignature(input: {
  name: string;
  payType: string;
  price: string;
  orderNumber: string;
  notifyUrl: string;
  appSecret: string;
}): string {
  return createHash("md5")
    .update(
      `${input.name}${input.payType}${input.price}${input.orderNumber}${input.notifyUrl}${input.appSecret}`,
      "utf8",
    )
    .digest("hex")
    .toLowerCase();
}

export function createXorPayCallbackSignature(input: {
  providerOrderId: string;
  orderNumber: string;
  paidPrice: string;
  paidTime: string;
  appSecret: string;
}): string {
  return createHash("md5")
    .update(
      `${input.providerOrderId}${input.orderNumber}${input.paidPrice}${input.paidTime}${input.appSecret}`,
      "utf8",
    )
    .digest("hex")
    .toLowerCase();
}

function signaturesMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received.toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expected.toLowerCase(), "utf8");
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function parseXorPayTime(value: string): Date {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}+08:00`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error("XorPay 回调支付时间格式无效");
  }
  return date;
}

export function verifyXorPayCallback(
  rawBody: string,
  appSecret: string,
): VerifiedPayment {
  const params = new URLSearchParams(rawBody);
  const providerOrderId = params.get("aoid")?.trim();
  const orderNumber = params.get("order_id")?.trim();
  const paidPrice = params.get("pay_price")?.trim();
  const paidTime = params.get("pay_time")?.trim();
  const receivedSign = params.get("sign")?.trim();

  if (
    !providerOrderId ||
    !orderNumber ||
    !paidPrice ||
    !paidTime ||
    !receivedSign
  ) {
    throw new Error("XorPay 回调缺少必要参数");
  }

  const expectedSign = createXorPayCallbackSignature({
    providerOrderId,
    orderNumber,
    paidPrice,
    paidTime,
    appSecret,
  });
  if (!signaturesMatch(receivedSign, expectedSign)) {
    throw new Error("XorPay 回调签名无效");
  }

  const amountInMinorUnits = parseCnyAmountToMinorUnits(paidPrice);
  if (amountInMinorUnits === null) {
    throw new Error("XorPay 回调金额格式无效");
  }

  return {
    provider: "xorpay",
    eventId: `payment.succeeded:${providerOrderId}`,
    eventType: "payment.succeeded",
    orderNumber,
    providerOrderId,
    amountInMinorUnits,
    currency: "CNY",
    transactionId: params.get("transaction_id")?.slice(0, 200) || null,
    occurredAt: parseXorPayTime(paidTime),
    payloadDigest: createHash("sha256").update(rawBody).digest("hex"),
  };
}

export class XorPayProvider implements PaymentProvider {
  readonly name = "xorpay";
  readonly supportedMethods = ["alipay", "native"] as const;

  constructor(
    private readonly config: {
      aid: string;
      appSecret: string;
      apiBaseUrl?: string;
    },
  ) {}

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<PaymentCheckout> {
    if (!this.supportedMethods.includes(input.method as "alipay" | "native")) {
      throw new Error("当前 XorPay Provider 不支持该支付方式");
    }
    if (input.currency !== "CNY") {
      throw new Error("XorPay Provider 当前只支持 CNY");
    }

    const price = formatMinorUnits(
      input.amountInMinorUnits,
      input.currency,
    );
    const payType = input.method;
    const sign = createXorPayRequestSignature({
      name: input.productTitle,
      payType,
      price,
      orderNumber: input.orderNumber,
      notifyUrl: input.notifyUrl,
      appSecret: this.config.appSecret,
    });
    const form = new URLSearchParams({
      name: input.productTitle,
      pay_type: payType,
      price,
      order_id: input.orderNumber,
      order_uid: input.customerReference,
      notify_url: input.notifyUrl,
      more: JSON.stringify({ orderNumber: input.orderNumber }),
      expire: "1800",
      sign,
    });

    const response = await fetch(
      `${this.config.apiBaseUrl ?? "https://xorpay.com"}/api/pay/${encodeURIComponent(this.config.aid)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new Error(`XorPay 请求失败（HTTP ${response.status}）`);
    }

    const parsed = xorPayResponseSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (
      !parsed.success ||
      parsed.data.status !== "ok" ||
      !parsed.data.aoid ||
      !parsed.data.info?.qr
    ) {
      const status = parsed.success ? parsed.data.status : "invalid_response";
      throw new Error(`XorPay 创建支付失败（${status}）`);
    }

    const expiresIn = parsed.data.expires_in ?? 1_800;
    return {
      provider: this.name,
      providerOrderId: parsed.data.aoid,
      mode: "payment_url",
      paymentUrl: parsed.data.info.qr,
      qrContent: parsed.data.info.qr,
      instructions:
        input.method === "alipay"
          ? "请使用支付宝打开支付链接或扫码支付。"
          : "请使用微信扫描支付二维码。",
      expiresAt: new Date(Date.now() + expiresIn * 1_000),
    };
  }
}
