import type { EntitlementType } from "@/modules/entitlement";

export const currencies = ["CNY"] as const;
export type Currency = (typeof currencies)[number];

export const orderStatuses = [
  "pending",
  "paid",
  "fulfilled",
  "failed",
  "expired",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const fulfillmentStatuses = [
  "pending",
  "processing",
  "fulfilled",
  "failed",
] as const;
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export const paymentProviderNames = ["manual", "mock", "xorpay"] as const;
export type PaymentProviderName = (typeof paymentProviderNames)[number];

export const paymentMethods = [
  "manual",
  "mock",
  "alipay",
  "native",
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentEventStatuses = [
  "received",
  "processing",
  "processed",
  "failed",
  "rejected",
] as const;
export type PaymentEventStatus = (typeof paymentEventStatuses)[number];

export interface ProductDefinition {
  id: string;
  title: string;
  description: string;
  price: {
    amountInMinorUnits: number;
    currency: Currency;
  };
  entitlement: {
    type: EntitlementType;
    targetId: string | null;
    targetSlug?: string;
    durationDays: number | null;
  };
  active: boolean;
}

export interface EntitlementWindow {
  startsAt: Date;
  endsAt: Date | null;
}

export function formatMinorUnits(
  amountInMinorUnits: number,
  currency: Currency,
): string {
  if (!Number.isSafeInteger(amountInMinorUnits) || amountInMinorUnits < 0) {
    throw new Error("金额必须是非负安全整数");
  }

  if (currency !== "CNY") {
    throw new Error(`暂不支持币种 ${currency satisfies never}`);
  }

  const yuan = Math.floor(amountInMinorUnits / 100);
  const cents = amountInMinorUnits % 100;
  return `${yuan}.${cents.toString().padStart(2, "0")}`;
}

export function parseCnyAmountToMinorUnits(value: string): number | null {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const yuan = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const amount = yuan * 100 + cents;
  return Number.isSafeInteger(amount) ? amount : null;
}

export function calculateEntitlementWindow(input: {
  now: Date;
  durationDays: number | null;
  existingEndsAt?: Date | null;
}): EntitlementWindow {
  if (input.durationDays === null) {
    return { startsAt: input.now, endsAt: null };
  }

  if (
    !Number.isInteger(input.durationDays) ||
    input.durationDays <= 0
  ) {
    throw new Error("权益有效期必须是正整数天或永久");
  }

  const base =
    input.existingEndsAt && input.existingEndsAt > input.now
      ? input.existingEndsAt
      : input.now;

  return {
    startsAt: input.now,
    endsAt: new Date(
      base.getTime() + input.durationDays * 24 * 60 * 60 * 1_000,
    ),
  };
}

export {
  productAdminCreateSchema,
  productAdminPatchSchema,
  productAdminStateSchema,
  type ProductAdminCreateInput,
  type ProductAdminPatchInput,
  type ProductAdminState,
} from "./product-admin";
