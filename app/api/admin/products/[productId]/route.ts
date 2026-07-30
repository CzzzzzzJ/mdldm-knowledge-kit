import { isValidObjectId } from "mongoose";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  productAdminPatchSchema,
  productAdminStateSchema,
} from "@/modules/commerce";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { ProductModel } from "@/providers/database/mongodb/models/commerce";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { productId } = await context.params;
  if (!isValidObjectId(productId)) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const patch = productAdminPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!patch.success) {
    return NextResponse.json(
      {
        error: "商品更新格式错误",
        issues: patch.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  await connectMongo();
  const product = await ProductModel.findById(productId);
  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const state = productAdminStateSchema.safeParse({
    title: patch.data.title ?? product.title,
    description: patch.data.description ?? product.description,
    amountInMinorUnits:
      patch.data.amountInMinorUnits ?? product.amountInMinorUnits,
    currency: patch.data.currency ?? product.currency,
    entitlementType:
      patch.data.entitlementType ?? product.entitlementType,
    entitlementTargetId:
      patch.data.entitlementTargetId === undefined
        ? product.entitlementTargetId
        : patch.data.entitlementTargetId,
    entitlementDurationDays:
      patch.data.entitlementDurationDays === undefined
        ? product.entitlementDurationDays
        : patch.data.entitlementDurationDays,
    active: patch.data.active ?? product.active,
  });
  if (!state.success) {
    return NextResponse.json(
      {
        error: "商品权益配置无效",
        issues: state.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (state.data.entitlementType !== "membership") {
    const model =
      state.data.entitlementType === "course" ? CourseModel : SeriesModel;
    if (!(await model.exists({ _id: state.data.entitlementTargetId }))) {
      return NextResponse.json(
        { error: "商品绑定的课程或系列不存在" },
        { status: 400 },
      );
    }
  }

  product.set(state.data);
  await product.save();

  return NextResponse.json({
    product: {
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
    },
  });
}
