import { isValidObjectId } from "mongoose";

import {
  productAdminStateSchema,
  type ProductAdminCreateInput,
  type ProductAdminPatchInput,
} from "@/modules/commerce";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  ProductModel,
  type ProductRecord,
} from "@/providers/database/mongodb/models/commerce";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export class CommerceAdminError extends Error {
  constructor(
    readonly code:
      | "PRODUCT_NOT_FOUND"
      | "SKU_EXISTS"
      | "TARGET_NOT_FOUND"
      | "INVALID_STATE",
    message: string,
    readonly issues: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.name = "CommerceAdminError";
  }
}

function serializeProduct(
  product: ProductRecord & { _id: { toString(): string } },
) {
  return {
    id: product._id.toString(),
    sku: product.sku,
    title: product.title,
    description: product.description,
    amountInMinorUnits: product.amountInMinorUnits,
    currency: product.currency,
    entitlementType: product.entitlementType,
    entitlementTargetId: product.entitlementTargetId,
    entitlementDurationDays: product.entitlementDurationDays,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function targetExists(input: {
  entitlementType: "membership" | "course" | "series";
  entitlementTargetId: string | null;
}) {
  if (input.entitlementType === "membership") return true;
  const model = input.entitlementType === "course" ? CourseModel : SeriesModel;
  return Boolean(await model.exists({ _id: input.entitlementTargetId }));
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function createAdminProduct(input: ProductAdminCreateInput) {
  await connectMongo();
  if (!(await targetExists(input))) {
    throw new CommerceAdminError(
      "TARGET_NOT_FOUND",
      "商品绑定的课程或系列不存在",
    );
  }
  try {
    return serializeProduct(await ProductModel.create(input));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new CommerceAdminError(
        "SKU_EXISTS",
        "SKU 已存在，创建后不能修改",
      );
    }
    throw error;
  }
}

export async function updateAdminProduct(
  productId: string,
  patch: ProductAdminPatchInput,
) {
  if (!isValidObjectId(productId)) {
    throw new CommerceAdminError("PRODUCT_NOT_FOUND", "商品不存在");
  }
  await connectMongo();
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new CommerceAdminError("PRODUCT_NOT_FOUND", "商品不存在");
  }

  const state = productAdminStateSchema.safeParse({
    title: patch.title ?? product.title,
    description: patch.description ?? product.description,
    amountInMinorUnits: patch.amountInMinorUnits ?? product.amountInMinorUnits,
    currency: patch.currency ?? product.currency,
    entitlementType: patch.entitlementType ?? product.entitlementType,
    entitlementTargetId:
      patch.entitlementTargetId === undefined
        ? product.entitlementTargetId
        : patch.entitlementTargetId,
    entitlementDurationDays:
      patch.entitlementDurationDays === undefined
        ? product.entitlementDurationDays
        : patch.entitlementDurationDays,
    active: patch.active ?? product.active,
  });
  if (!state.success) {
    throw new CommerceAdminError(
      "INVALID_STATE",
      "商品权益配置无效",
      state.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  if (!(await targetExists(state.data))) {
    throw new CommerceAdminError(
      "TARGET_NOT_FOUND",
      "商品绑定的课程或系列不存在",
    );
  }

  product.set(state.data);
  await product.save();
  return serializeProduct(product);
}
