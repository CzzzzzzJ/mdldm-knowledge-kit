import { createHash, randomBytes } from "node:crypto";

import { isValidObjectId, type Types } from "mongoose";

import { getServerEnv } from "@/config/env";
import { getFeaturesConfig } from "@/config/features.config";
import { productsConfig } from "@/config/products.config";
import {
  reportOperationalFailure,
  resolveOperationalFailures,
} from "@/app/lib/operations-service";
import {
  calculateEntitlementWindow,
  type Currency,
  type PaymentMethod,
  type PaymentProviderName,
} from "@/modules/commerce";
import { getPaymentProvider } from "@/providers/payment";
import type {
  PaymentCheckout,
  VerifiedPayment,
} from "@/providers/payment/port";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
  PaymentEventModel,
  ProductModel,
  type OrderRecord,
} from "@/providers/database/mongodb/models/commerce";
import { EntitlementModel } from "@/providers/database/mongodb/models/entitlement";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export class CommerceError extends Error {
  constructor(
    readonly code:
      | "PRODUCT_NOT_FOUND"
      | "PAYMENT_METHOD_NOT_ALLOWED"
      | "ORDER_NOT_FOUND"
      | "ORDER_FORBIDDEN"
      | "ORDER_STATE_INVALID"
      | "PAYMENT_EVENT_BUSY"
      | "PAYMENT_PROVIDER_MISMATCH"
      | "PAYMENT_AMOUNT_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function createOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const entropy = randomBytes(5).toString("hex").toUpperCase();
  return `MKK-${timestamp}-${entropy}`;
}

function digestInternalEvent(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function resolveConfiguredTarget(input: {
  type: "membership" | "course" | "series";
  targetId: string | null;
  targetSlug?: string;
}): Promise<string | null | undefined> {
  if (input.type === "membership") {
    return null;
  }
  if (input.targetId) {
    return input.targetId;
  }
  if (!input.targetSlug) {
    return undefined;
  }

  const target =
    input.type === "course"
      ? await CourseModel.findOne({ slug: input.targetSlug }).select("_id")
      : await SeriesModel.findOne({ slug: input.targetSlug }).select("_id");
  return target?._id.toString();
}

export async function syncConfiguredProducts(): Promise<{
  synced: number;
  unavailable: string[];
}> {
  await connectMongo();
  let synced = 0;
  const unavailable: string[] = [];

  for (const definition of productsConfig) {
    const targetId = await resolveConfiguredTarget(definition.entitlement);
    if (targetId === undefined) {
      unavailable.push(definition.id);
      await ProductModel.updateOne(
        { sku: definition.id },
        { $set: { active: false } },
      );
      continue;
    }

    const product =
      (await ProductModel.findOne({ sku: definition.id })) ??
      new ProductModel({ sku: definition.id });
    product.set({
      title: definition.title,
      description: definition.description,
      amountInMinorUnits: definition.price.amountInMinorUnits,
      currency: definition.price.currency,
      entitlementType: definition.entitlement.type,
      entitlementTargetId: targetId,
      entitlementDurationDays: definition.entitlement.durationDays,
      active: definition.active,
    });
    await product.save();
    synced += 1;
  }

  return { synced, unavailable };
}

export async function listActiveProducts() {
  await syncConfiguredProducts();
  return ProductModel.find({ active: true }).sort({ createdAt: 1 }).lean();
}

export async function createCheckout(input: {
  userId: string;
  userEmail: string;
  productId: string;
  paymentMethod: PaymentMethod;
}): Promise<{
  order: {
    id: string;
    orderNumber: string;
    status: string;
    fulfillmentStatus: string;
    amountInMinorUnits: number;
    currency: Currency;
  };
  checkout: PaymentCheckout;
}> {
  if (!isValidObjectId(input.userId)) {
    throw new CommerceError("ORDER_FORBIDDEN", "用户身份无效");
  }

  await syncConfiguredProducts();
  const features = getFeaturesConfig();
  const product = await ProductModel.findOne({
    sku: input.productId,
    active: true,
  });
  if (
    !product ||
    (product.entitlementType === "membership" &&
      !features.membership) ||
    (product.entitlementType === "course" &&
      !features.singleCoursePurchase)
  ) {
    throw new CommerceError("PRODUCT_NOT_FOUND", "商品不存在或未启用");
  }

  const provider = getPaymentProvider();
  if (!provider.supportedMethods.includes(input.paymentMethod)) {
    throw new CommerceError(
      "PAYMENT_METHOD_NOT_ALLOWED",
      "当前支付 Provider 不支持该支付方式",
    );
  }

  const order = await OrderModel.create({
    orderNumber: createOrderNumber(),
    userId: input.userId,
    status: "pending",
    fulfillmentStatus: "pending",
    amountInMinorUnits: product.amountInMinorUnits,
    currency: product.currency,
    provider: provider.name,
    paymentMethod: input.paymentMethod,
    providerOrderId: null,
    expiresAt: null,
    paidAt: null,
    fulfilledAt: null,
    retryCount: 0,
    lastError: null,
  });

  try {
    await OrderItemModel.create({
      orderId: order._id,
      productId: product._id,
      sku: product.sku,
      title: product.title,
      quantity: 1,
      unitAmountInMinorUnits: product.amountInMinorUnits,
      totalAmountInMinorUnits: product.amountInMinorUnits,
      currency: product.currency,
      entitlementType: product.entitlementType,
      entitlementTargetId: product.entitlementTargetId,
      entitlementDurationDays: product.entitlementDurationDays,
      entitlementId: null,
    });

    const env = getServerEnv();
    const notifyUrl =
      env.XORPAY_NOTIFY_URL ??
      new URL("/api/payments/webhooks/xorpay", env.APP_URL).toString();
    const checkout = await provider.createPayment({
      orderNumber: order.orderNumber,
      customerReference: input.userEmail,
      productTitle: product.title,
      amountInMinorUnits: product.amountInMinorUnits,
      currency: product.currency,
      method: input.paymentMethod,
      notifyUrl,
    });

    order.providerOrderId = checkout.providerOrderId;
    order.expiresAt = checkout.expiresAt;
    await order.save();

    return {
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        amountInMinorUnits: order.amountInMinorUnits,
        currency: order.currency,
      },
      checkout,
    };
  } catch (error) {
    order.status = "failed";
    order.fulfillmentStatus = "failed";
    order.lastError =
      error instanceof Error ? error.message.slice(0, 1_000) : "创建支付失败";
    await order.save();
    await reportOperationalFailure({
      category: "payment",
      severity: "error",
      code: "PAYMENT_CHECKOUT_FAILED",
      summary: "创建支付订单失败",
      error,
      provider: provider.name,
      sourceType: "order",
      sourceId: order._id.toString(),
    });
    throw error;
  }
}

async function createOrLoadPaymentEvent(payment: VerifiedPayment) {
  try {
    return await PaymentEventModel.create({
      provider: payment.provider,
      eventId: payment.eventId,
      eventType: payment.eventType,
      status: "received",
      orderId: null,
      orderNumber: payment.orderNumber,
      providerOrderId: payment.providerOrderId,
      amountInMinorUnits: payment.amountInMinorUnits,
      currency: payment.currency,
      transactionId: payment.transactionId,
      occurredAt: payment.occurredAt,
      payloadDigest: payment.payloadDigest,
      attemptCount: 0,
      processedAt: null,
      lastError: null,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    const existing = await PaymentEventModel.findOne({
      provider: payment.provider,
      eventId: payment.eventId,
    });
    if (!existing) {
      throw error;
    }
    return existing;
  }
}

async function fulfillOrder(
  order: { _id: Types.ObjectId } & OrderRecord,
): Promise<void> {
  const claimed = await OrderModel.findOneAndUpdate(
    {
      _id: order._id,
      status: { $in: ["paid", "fulfilled"] },
      fulfillmentStatus: { $in: ["pending", "failed"] },
    },
    {
      $set: {
        fulfillmentStatus: "processing",
        lastError: null,
      },
      $inc: { retryCount: 1 },
    },
    { new: true },
  );

  if (!claimed) {
    const current = await OrderModel.findById(order._id);
    if (current?.fulfillmentStatus === "fulfilled") {
      return;
    }
    throw new CommerceError(
      "PAYMENT_EVENT_BUSY",
      "订单授权正在处理中，请稍后重试",
    );
  }

  try {
    const items = await OrderItemModel.find({ orderId: order._id }).sort({
      createdAt: 1,
    });
    if (items.length === 0) {
      throw new Error("订单缺少商品快照");
    }

    for (const item of items) {
      let entitlement = await EntitlementModel.findOne({
        sourceType: "order",
        sourceId: item._id.toString(),
      });

      if (!entitlement) {
        const now = new Date();
        const latest = item.entitlementDurationDays
          ? await EntitlementModel.findOne({
              userId: order.userId,
              type: item.entitlementType,
              targetId: item.entitlementTargetId,
              revokedAt: null,
              endsAt: { $gt: now },
            }).sort({ endsAt: -1 })
          : null;
        const window = calculateEntitlementWindow({
          now,
          durationDays: item.entitlementDurationDays,
          existingEndsAt: latest?.endsAt,
        });

        try {
          entitlement = await EntitlementModel.create({
            userId: order.userId,
            type: item.entitlementType,
            targetId: item.entitlementTargetId,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            revokedAt: null,
            sourceType: "order",
            sourceId: item._id.toString(),
          });
        } catch (error) {
          if (!isDuplicateKeyError(error)) {
            throw error;
          }
          entitlement = await EntitlementModel.findOne({
            sourceType: "order",
            sourceId: item._id.toString(),
          });
          if (!entitlement) {
            throw error;
          }
        }
      }

      item.entitlementId = entitlement._id;
      await item.save();
    }

    await OrderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "fulfilled",
          fulfillmentStatus: "fulfilled",
          fulfilledAt: new Date(),
          lastError: null,
        },
      },
    );
    await resolveOperationalFailures({
      category: "payment",
      code: "ORDER_FULFILLMENT_FAILED",
      sourceType: "order",
      sourceId: order._id.toString(),
    });
  } catch (error) {
    await OrderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          fulfillmentStatus: "failed",
          lastError:
            error instanceof Error
              ? error.message.slice(0, 1_000)
              : "授权失败",
        },
      },
    );
    await reportOperationalFailure({
      category: "payment",
      severity: "critical",
      code: "ORDER_FULFILLMENT_FAILED",
      summary: "支付成功但权益发放失败",
      error,
      provider: order.provider,
      sourceType: "order",
      sourceId: order._id.toString(),
    });
    throw error;
  }
}

export async function processVerifiedPayment(
  payment: VerifiedPayment,
): Promise<{ alreadyProcessed: boolean; orderId: string }> {
  await connectMongo();
  const event = await createOrLoadPaymentEvent(payment);
  if (event.status === "processed" && event.orderId) {
    return {
      alreadyProcessed: true,
      orderId: event.orderId.toString(),
    };
  }

  const order = await OrderModel.findOne({
    orderNumber: payment.orderNumber,
  });
  if (!order) {
    event.status = "rejected";
    event.lastError = "ORDER_NOT_FOUND";
    await event.save();
    await reportOperationalFailure({
      category: "payment",
      severity: "warning",
      code: "PAYMENT_ORDER_NOT_FOUND",
      summary: "支付事件无法匹配订单",
      error: event.lastError,
      provider: payment.provider,
      sourceType: "payment_event",
      sourceId: event._id.toString(),
    });
    throw new CommerceError("ORDER_NOT_FOUND", "支付事件对应的订单不存在");
  }

  event.orderId = order._id;
  if (order.provider !== payment.provider) {
    event.status = "rejected";
    event.lastError = "PAYMENT_PROVIDER_MISMATCH";
    await event.save();
    await reportOperationalFailure({
      category: "payment",
      severity: "critical",
      code: "PAYMENT_PROVIDER_MISMATCH",
      summary: "支付事件与订单 Provider 不一致",
      error: event.lastError,
      provider: payment.provider,
      sourceType: "payment_event",
      sourceId: event._id.toString(),
    });
    throw new CommerceError(
      "PAYMENT_PROVIDER_MISMATCH",
      "支付事件与订单 Provider 不一致",
    );
  }
  if (
    order.amountInMinorUnits !== payment.amountInMinorUnits ||
    order.currency !== payment.currency
  ) {
    event.status = "rejected";
    event.lastError = "PAYMENT_AMOUNT_MISMATCH";
    await event.save();
    await reportOperationalFailure({
      category: "payment",
      severity: "critical",
      code: "PAYMENT_AMOUNT_MISMATCH",
      summary: "支付金额或币种与服务端订单不一致",
      error: event.lastError,
      provider: payment.provider,
      sourceType: "payment_event",
      sourceId: event._id.toString(),
    });
    throw new CommerceError(
      "PAYMENT_AMOUNT_MISMATCH",
      "支付金额或币种与服务端订单不一致",
    );
  }

  const claimed = await PaymentEventModel.findOneAndUpdate(
    {
      _id: event._id,
      status: { $in: ["received", "failed"] },
    },
    {
      $set: { status: "processing", lastError: null, orderId: order._id },
      $inc: { attemptCount: 1 },
    },
    { new: true },
  );
  if (!claimed) {
    const current = await PaymentEventModel.findById(event._id);
    if (current?.status === "processed") {
      return { alreadyProcessed: true, orderId: order._id.toString() };
    }
    throw new CommerceError(
      "PAYMENT_EVENT_BUSY",
      "支付事件正在处理中",
    );
  }

  try {
    if (order.status !== "fulfilled") {
      order.status = "paid";
    }
    order.fulfillmentStatus =
      order.fulfillmentStatus === "fulfilled"
        ? "fulfilled"
        : "pending";
    order.providerOrderId ||= payment.providerOrderId;
    order.paidAt ||= payment.occurredAt;
    order.lastError = null;
    await order.save();

    await fulfillOrder(order);

    claimed.status = "processed";
    claimed.processedAt = new Date();
    claimed.lastError = null;
    await claimed.save();

    return { alreadyProcessed: false, orderId: order._id.toString() };
  } catch (error) {
    claimed.status = "failed";
    claimed.lastError =
      error instanceof Error ? error.message.slice(0, 1_000) : "处理失败";
    await claimed.save();
    throw error;
  }
}

export async function recordRejectedXorPayCallback(input: {
  rawBody: string;
  reason: string;
}): Promise<void> {
  await connectMongo();
  const payloadDigest = digestInternalEvent(input.rawBody);
  await PaymentEventModel.updateOne(
    { provider: "xorpay", eventId: `rejected:${payloadDigest}` },
    {
      $setOnInsert: {
        provider: "xorpay",
        eventId: `rejected:${payloadDigest}`,
        eventType: "payment.callback.rejected",
        status: "rejected",
        orderId: null,
        orderNumber: null,
        providerOrderId: null,
        amountInMinorUnits: null,
        currency: null,
        transactionId: null,
        occurredAt: null,
        payloadDigest,
        attemptCount: 0,
        processedAt: null,
        lastError: input.reason.slice(0, 1_000),
      },
    },
    { upsert: true },
  );
  await reportOperationalFailure({
    category: "payment",
    severity: "warning",
    code: "PAYMENT_CALLBACK_REJECTED",
    summary: "XorPay 回调未通过验签或结构校验",
    error: input.reason,
    provider: "xorpay",
    sourceType: "webhook",
    sourceId: "xorpay",
  });
}

export async function confirmInternalPayment(input: {
  orderId: string;
  provider: Extract<PaymentProviderName, "manual" | "mock">;
  userId?: string;
}): Promise<{ alreadyProcessed: boolean; orderId: string }> {
  if (!isValidObjectId(input.orderId)) {
    throw new CommerceError("ORDER_NOT_FOUND", "订单不存在");
  }
  await connectMongo();
  const order = await OrderModel.findById(input.orderId);
  if (!order) {
    throw new CommerceError("ORDER_NOT_FOUND", "订单不存在");
  }
  if (input.userId && order.userId.toString() !== input.userId) {
    throw new CommerceError("ORDER_FORBIDDEN", "无权确认该订单");
  }
  if (order.provider !== input.provider) {
    throw new CommerceError(
      "PAYMENT_PROVIDER_MISMATCH",
      "订单不属于当前支付 Provider",
    );
  }
  if (
    !["pending", "paid", "fulfilled"].includes(order.status) ||
    (order.expiresAt && order.expiresAt <= new Date())
  ) {
    throw new CommerceError(
      "ORDER_STATE_INVALID",
      "当前订单状态不能确认支付",
    );
  }

  const now = new Date();
  const eventSeed = `${input.provider}:${order.orderNumber}:confirmed`;
  return processVerifiedPayment({
    provider: input.provider,
    eventId: `payment.succeeded:${order.orderNumber}`,
    eventType: "payment.succeeded",
    orderNumber: order.orderNumber,
    providerOrderId:
      order.providerOrderId ?? `${input.provider}:${order.orderNumber}`,
    amountInMinorUnits: order.amountInMinorUnits,
    currency: order.currency,
    transactionId: null,
    occurredAt: now,
    payloadDigest: digestInternalEvent(eventSeed),
  });
}

export async function retryOrderFulfillment(
  orderId: string,
): Promise<void> {
  if (!isValidObjectId(orderId)) {
    throw new CommerceError("ORDER_NOT_FOUND", "订单不存在");
  }
  await connectMongo();
  const order = await OrderModel.findById(orderId);
  if (
    !order ||
    !["paid", "fulfilled"].includes(order.status) ||
    !["failed", "fulfilled"].includes(order.fulfillmentStatus)
  ) {
    throw new CommerceError(
      "ORDER_STATE_INVALID",
      "只有支付成功且授权失败的订单可以重试",
    );
  }

  if (order.fulfillmentStatus === "fulfilled") {
    return;
  }
  await fulfillOrder(order);
  await PaymentEventModel.updateMany(
    { orderId: order._id, status: "failed" },
    {
      $set: {
        status: "processed",
        processedAt: new Date(),
        lastError: null,
      },
    },
  );
}
