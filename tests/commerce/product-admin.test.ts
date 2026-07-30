import { describe, expect, it } from "vitest";

import {
  productAdminCreateSchema,
  productAdminPatchSchema,
  productAdminStateSchema,
} from "@/modules/commerce";

const membershipProduct = {
  sku: "membership-yearly",
  title: "全站年度会员",
  description: "购买后在一年内访问所有会员内容。",
  amountInMinorUnits: 49_900,
  currency: "CNY",
  entitlementType: "membership",
  entitlementTargetId: null,
  entitlementDurationDays: 365,
  active: true,
} as const;

describe("product admin input", () => {
  it("accepts a strict membership product priced in integer minor units", () => {
    expect(productAdminCreateSchema.parse(membershipProduct)).toEqual(
      membershipProduct,
    );
  });

  it("accepts permanent course and series products with an explicit target", () => {
    for (const entitlementType of ["course", "series"] as const) {
      expect(
        productAdminCreateSchema.safeParse({
          ...membershipProduct,
          sku: `${entitlementType}-foundations`,
          entitlementType,
          entitlementTargetId: "66aa11bb22cc33dd44ee55ff",
          entitlementDurationDays: null,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects client-shaped prices, unsafe targets, and unknown fields", () => {
    expect(
      productAdminCreateSchema.safeParse({
        ...membershipProduct,
        amountInMinorUnits: 99.9,
      }).success,
    ).toBe(false);
    expect(
      productAdminCreateSchema.safeParse({
        ...membershipProduct,
        entitlementType: "course",
        entitlementTargetId: null,
      }).success,
    ).toBe(false);
    expect(
      productAdminCreateSchema.safeParse({
        ...membershipProduct,
        entitlementTargetId: "66aa11bb22cc33dd44ee55ff",
      }).success,
    ).toBe(false);
    expect(
      productAdminCreateSchema.safeParse({
        ...membershipProduct,
        amount: 1,
      }).success,
    ).toBe(false);
  });

  it("keeps SKU immutable and validates the complete state after a patch", () => {
    const membershipState = {
      title: membershipProduct.title,
      description: membershipProduct.description,
      amountInMinorUnits: membershipProduct.amountInMinorUnits,
      currency: membershipProduct.currency,
      entitlementType: membershipProduct.entitlementType,
      entitlementTargetId: membershipProduct.entitlementTargetId,
      entitlementDurationDays: membershipProduct.entitlementDurationDays,
      active: membershipProduct.active,
    };

    expect(
      productAdminPatchSchema.safeParse({ sku: "replacement-sku" }).success,
    ).toBe(false);
    expect(productAdminPatchSchema.safeParse({}).success).toBe(false);
    expect(
      productAdminPatchSchema.safeParse({
        amountInMinorUnits: 12_700,
        active: false,
      }).success,
    ).toBe(true);
    expect(
      productAdminStateSchema.safeParse({
        ...membershipState,
        entitlementType: "series",
        entitlementTargetId: null,
      }).success,
    ).toBe(false);
  });
});
