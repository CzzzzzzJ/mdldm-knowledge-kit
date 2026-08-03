import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CommerceAdminError,
  updateAdminProduct,
} from "@/app/lib/commerce-admin-service";
import { productAdminPatchSchema } from "@/modules/commerce";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) return authorization.response;

  const { productId } = await context.params;
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

  try {
    return NextResponse.json({
      product: await updateAdminProduct(productId, patch.data),
    });
  } catch (error) {
    if (error instanceof CommerceAdminError) {
      return NextResponse.json(
        { error: error.message, issues: error.issues },
        { status: error.code === "PRODUCT_NOT_FOUND" ? 404 : 400 },
      );
    }
    throw error;
  }
}
