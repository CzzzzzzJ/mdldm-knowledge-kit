import { NextResponse, type NextRequest } from "next/server";

import {
  CommerceError,
  confirmInternalPayment,
} from "@/app/lib/commerce-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { getServerEnv } from "@/config/env";
import { getCurrentUser } from "@/providers/auth/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "confirm-mock-payment", {
      limit: 30,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  if (
    getServerEnv().NODE_ENV === "production" ||
    getServerEnv().PAYMENT_PROVIDER !== "mock"
  ) {
    return NextResponse.json(
      { error: "Mock 支付只在非生产 Mock Provider 下可用" },
      { status: 404 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { orderId } = await context.params;

  try {
    const result = await confirmInternalPayment({
      orderId,
      provider: "mock",
      userId: user.id,
    });
    return NextResponse.json({ confirmed: true, ...result });
  } catch (error) {
    if (error instanceof CommerceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status:
            error.code === "ORDER_NOT_FOUND"
              ? 404
              : error.code === "ORDER_FORBIDDEN"
                ? 403
                : 409,
        },
      );
    }
    console.error("Mock 支付确认失败", error);
    return NextResponse.json({ error: "支付确认失败" }, { status: 500 });
  }
}
