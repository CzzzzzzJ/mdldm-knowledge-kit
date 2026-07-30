import { z } from "zod";

import { entitlementTypes } from "@/modules/entitlement";

const productCurrencies = ["CNY"] as const;

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{24}$/i, "请选择有效的课程或系列");

const mutableProductFields = {
  title: z.string().trim().min(1, "请填写商品标题").max(120),
  description: z.string().trim().min(1, "请填写商品说明").max(2_000),
  amountInMinorUnits: z
    .number()
    .int("价格必须使用整数分")
    .safe("价格超出安全范围")
    .min(1, "价格必须大于 0 分"),
  currency: z.enum(productCurrencies),
  entitlementType: z.enum(entitlementTypes),
  entitlementTargetId: objectIdSchema.nullable(),
  entitlementDurationDays: z
    .number()
    .int("期限必须是整数天")
    .min(1, "期限必须大于 0 天")
    .max(36_500, "期限不能超过 36500 天")
    .nullable(),
  active: z.boolean(),
};

function validateEntitlementTarget(
  value: {
    entitlementType: (typeof entitlementTypes)[number];
    entitlementTargetId: string | null;
  },
  context: z.RefinementCtx,
) {
  if (
    value.entitlementType === "membership" &&
    value.entitlementTargetId !== null
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["entitlementTargetId"],
      message: "全站会员商品不能绑定课程或系列",
    });
  }

  if (
    value.entitlementType !== "membership" &&
    value.entitlementTargetId === null
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["entitlementTargetId"],
      message: "单课或系列商品必须选择对应目标",
    });
  }
}

export const productAdminStateSchema = z
  .object(mutableProductFields)
  .strict()
  .superRefine(validateEntitlementTarget);

export const productAdminCreateSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1, "请填写 SKU")
      .max(120)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "SKU 只能包含小写字母、数字和中划线",
      ),
    ...mutableProductFields,
  })
  .strict()
  .superRefine(validateEntitlementTarget);

export const productAdminPatchSchema = z
  .object(mutableProductFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "至少提交一个需要更新的字段",
  });

export type ProductAdminCreateInput = z.infer<
  typeof productAdminCreateSchema
>;
export type ProductAdminPatchInput = z.infer<
  typeof productAdminPatchSchema
>;
export type ProductAdminState = z.infer<typeof productAdminStateSchema>;
