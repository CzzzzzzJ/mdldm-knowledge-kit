import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CommerceError,
  confirmInternalPayment,
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
    const result = await confirmInternalPayment({
      orderId,
      provider: "manual",
    });
    return NextResponse.json({ confirmed: true, ...result });
  } catch (error) {
    if (error instanceof CommerceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "ORDER_NOT_FOUND" ? 404 : 409 },
      );
    }
    console.error("手工确认订单失败", error);
    return NextResponse.json({ error: "订单确认失败" }, { status: 500 });
  }
}
