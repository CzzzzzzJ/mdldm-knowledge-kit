import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CommerceAdminError,
  createAdminProduct,
} from "@/app/lib/commerce-admin-service";
import { getAdminProductWorkspace } from "@/app/lib/commerce-query-service";
import { productAdminCreateSchema } from "@/modules/commerce";
import { requireAdmin } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { products } = await getAdminProductWorkspace();
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) return authorization.response;

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

  try {
    return NextResponse.json(
      { product: await createAdminProduct(parsed.data) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CommerceAdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "SKU_EXISTS" ? 409 : 400 },
      );
    }
    return NextResponse.json(
      { error: "商品创建失败，请检查数据库连接后重试" },
      { status: 500 },
    );
  }
}
