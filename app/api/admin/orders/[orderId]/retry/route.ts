import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CommerceError,
  retryOrderFulfillment,
} from "@/app/lib/commerce-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }
  const { orderId } = await context.params;

  try {
    await retryOrderFulfillment(orderId);
    return NextResponse.json({ retried: true });
  } catch (error) {
    if (error instanceof CommerceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "ORDER_NOT_FOUND" ? 404 : 409 },
      );
    }
    console.error("重试订单授权失败", error);
    return NextResponse.json({ error: "重试授权失败" }, { status: 500 });
  }
}
