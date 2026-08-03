import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  CommerceError,
  createCheckout,
} from "@/app/lib/commerce-service";
import { isSiteLive } from "@/app/lib/site-initialization-service";
import { structuredLog } from "@/app/lib/operations-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { paymentMethods } from "@/modules/commerce";
import { getCurrentUser } from "@/providers/auth/session";

const checkoutInput = z
  .object({
    productId: z.string().trim().min(1).max(120),
    paymentMethod: z.enum(paymentMethods),
  })
  .strict();

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "create-checkout", {
      limit: 20,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  if (!(await isSiteLive())) {
    return NextResponse.json(
      { error: "网站仍在配置中，暂未开放购买" },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "请先登录并验证邮箱" },
      { status: 401 },
    );
  }

  const parsed = checkoutInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "下单参数格式错误，只能提交 productId 和 paymentMethod" },
      { status: 400 },
    );
  }

  try {
    const result = await createCheckout({
      userId: user.id,
      userEmail: user.email,
      productId: parsed.data.productId,
      paymentMethod: parsed.data.paymentMethod,
    });
    return NextResponse.json(
      {
        ...result,
        checkout: {
          ...result.checkout,
          expiresAt: result.checkout.expiresAt?.toISOString() ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CommerceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status:
            error.code === "PRODUCT_NOT_FOUND"
              ? 404
              : error.code === "PAYMENT_METHOD_NOT_ALLOWED"
                ? 400
                : 409,
        },
      );
    }
    structuredLog("error", "checkout_failed", { error });
    return NextResponse.json(
      { error: "创建订单失败，请稍后重试" },
      { status: 502 },
    );
  }
}
