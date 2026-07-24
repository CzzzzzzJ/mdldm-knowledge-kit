import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  currencies,
  fulfillmentStatuses,
  orderStatuses,
  paymentEventStatuses,
  paymentProviderNames,
  type Currency,
  type FulfillmentStatus,
  type OrderStatus,
  type PaymentEventStatus,
  type PaymentProviderName,
} from "@/modules/commerce";
import {
  entitlementTypes,
  type EntitlementType,
} from "@/modules/entitlement";

export interface ProductRecord {
  sku: string;
  title: string;
  description: string;
  amountInMinorUnits: number;
  currency: Currency;
  entitlementType: EntitlementType;
  entitlementTargetId: string | null;
  entitlementDurationDays: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductRecord>(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2_000 },
    amountInMinorUnits: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    currency: { type: String, enum: currencies, required: true },
    entitlementType: {
      type: String,
      enum: entitlementTypes,
      required: true,
    },
    entitlementTargetId: {
      type: String,
      default: null,
      validate: {
        validator(this: ProductRecord, value: string | null) {
          return this.entitlementType === "membership"
            ? value === null
            : typeof value === "string" && value.length > 0;
        },
        message: "会员商品不能设置目标，单课/系列商品必须设置目标",
      },
    },
    entitlementDurationDays: {
      type: Number,
      default: null,
      min: 1,
      validate(value: number | null) {
        return value === null || Number.isInteger(value);
      },
    },
    active: { type: Boolean, required: true, default: true },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ active: 1, createdAt: -1 });

export const ProductModel =
  (models.Product as Model<ProductRecord> | undefined) ??
  model<ProductRecord>("Product", productSchema);

export interface OrderRecord {
  orderNumber: string;
  userId: Types.ObjectId;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  amountInMinorUnits: number;
  currency: Currency;
  provider: PaymentProviderName;
  paymentMethod: string;
  providerOrderId: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<OrderRecord>(
  {
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: orderStatuses,
      required: true,
      default: "pending",
    },
    fulfillmentStatus: {
      type: String,
      enum: fulfillmentStatuses,
      required: true,
      default: "pending",
    },
    amountInMinorUnits: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    currency: { type: String, enum: currencies, required: true },
    provider: {
      type: String,
      enum: paymentProviderNames,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    providerOrderId: {
      type: String,
      default: null,
      maxlength: 160,
    },
    expiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
    retryCount: { type: Number, required: true, default: 0, min: 0 },
    lastError: { type: String, default: null, maxlength: 1_000 },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index(
  { provider: 1, providerOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerOrderId: { $type: "string" } },
  },
);
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, fulfillmentStatus: 1, updatedAt: -1 });

export const OrderModel =
  (models.Order as Model<OrderRecord> | undefined) ??
  model<OrderRecord>("Order", orderSchema);

export interface OrderItemRecord {
  orderId: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  title: string;
  quantity: number;
  unitAmountInMinorUnits: number;
  totalAmountInMinorUnits: number;
  currency: Currency;
  entitlementType: EntitlementType;
  entitlementTargetId: string | null;
  entitlementDurationDays: number | null;
  entitlementId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemRecord>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1, max: 1 },
    unitAmountInMinorUnits: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    totalAmountInMinorUnits: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    currency: { type: String, enum: currencies, required: true },
    entitlementType: {
      type: String,
      enum: entitlementTypes,
      required: true,
    },
    entitlementTargetId: { type: String, default: null },
    entitlementDurationDays: { type: Number, default: null, min: 1 },
    entitlementId: {
      type: Schema.Types.ObjectId,
      ref: "Entitlement",
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

orderItemSchema.index({ orderId: 1, sku: 1 }, { unique: true });

export const OrderItemModel =
  (models.OrderItem as Model<OrderItemRecord> | undefined) ??
  model<OrderItemRecord>("OrderItem", orderItemSchema);

export interface PaymentEventRecord {
  provider: PaymentProviderName;
  eventId: string;
  eventType: string;
  status: PaymentEventStatus;
  orderId: Types.ObjectId | null;
  orderNumber: string | null;
  providerOrderId: string | null;
  amountInMinorUnits: number | null;
  currency: Currency | null;
  transactionId: string | null;
  occurredAt: Date | null;
  payloadDigest: string;
  attemptCount: number;
  processedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentEventSchema = new Schema<PaymentEventRecord>(
  {
    provider: {
      type: String,
      enum: paymentProviderNames,
      required: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: paymentEventStatuses,
      required: true,
      default: "received",
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    orderNumber: { type: String, default: null, maxlength: 80 },
    providerOrderId: { type: String, default: null, maxlength: 160 },
    amountInMinorUnits: { type: Number, default: null, min: 0 },
    currency: { type: String, enum: [...currencies, null], default: null },
    transactionId: { type: String, default: null, maxlength: 200 },
    occurredAt: { type: Date, default: null },
    payloadDigest: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/,
    },
    attemptCount: { type: Number, required: true, default: 0, min: 0 },
    processedAt: { type: Date, default: null },
    lastError: { type: String, default: null, maxlength: 1_000 },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

paymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
paymentEventSchema.index({ status: 1, updatedAt: 1 });
paymentEventSchema.index({ orderId: 1, createdAt: -1 });

export const PaymentEventModel =
  (models.PaymentEvent as Model<PaymentEventRecord> | undefined) ??
  model<PaymentEventRecord>("PaymentEvent", paymentEventSchema);
