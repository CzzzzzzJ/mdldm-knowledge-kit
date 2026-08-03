import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { productAdminCreateSchema } from "@/modules/commerce";
import { requireAdmin } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  ProductModel,
  type ProductRecord,
} from "@/providers/database/mongodb/models/commerce";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

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
  if (input.entitlementType === "membership") {
    return true;
  }

  const model =
    input.entitlementType === "course" ? CourseModel : SeriesModel;
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

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  await connectMongo();
  const products = await ProductModel.find()
    .sort({ active: -1, createdAt: -1 })
    .lean();

  return NextResponse.json(
    { products: products.map(serializeProduct) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = productAdminCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "商品数据格式错误",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  await connectMongo();
  if (!(await targetExists(parsed.data))) {
    return NextResponse.json(
      { error: "商品绑定的课程或系列不存在" },
      { status: 400 },
    );
  }

  try {
    const product = await ProductModel.create(parsed.data);
    return NextResponse.json(
      { product: serializeProduct(product) },
      { status: 201 },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: "SKU 已存在，创建后不能修改" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "商品创建失败，请检查数据库连接后重试" },
      { status: 500 },
    );
  }
}
