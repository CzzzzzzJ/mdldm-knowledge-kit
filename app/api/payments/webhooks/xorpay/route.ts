import { NextResponse, type NextRequest } from "next/server";

import {
  CommerceError,
  processVerifiedPayment,
  recordRejectedXorPayCallback,
} from "@/app/lib/commerce-service";
import { getServerEnv } from "@/config/env";
import { verifyXorPayCallback } from "@/providers/payment/xorpay";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length === 0 || rawBody.length > 16_384) {
    return new NextResponse("invalid payload", { status: 400 });
  }

  const secret = getServerEnv().XORPAY_APP_SECRET;
  if (!secret) {
    return new NextResponse("provider unavailable", { status: 503 });
  }

  let payment;
  try {
    payment = verifyXorPayCallback(rawBody, secret);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "XorPay 回调验证失败";
    await recordRejectedXorPayCallback({ rawBody, reason }).catch(
      (recordError: unknown) => {
        console.error("记录被拒绝的 XorPay 回调失败", recordError);
      },
    );
    return new NextResponse("invalid signature or payload", { status: 400 });
  }

  try {
    await processVerifiedPayment(payment);
    return new NextResponse("success", { status: 200 });
  } catch (error) {
    if (error instanceof CommerceError) {
      return new NextResponse(error.code, {
        status: error.code === "PAYMENT_EVENT_BUSY" ? 409 : 400,
      });
    }
    console.error("处理 XorPay 回调失败", error);
    return new NextResponse("retry", { status: 500 });
  }
}
