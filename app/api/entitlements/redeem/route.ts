import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { redeemInvitation } from "@/app/lib/entitlement-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { getCurrentUser } from "@/providers/auth/session";

const schema = z
  .object({
    code: z.string().trim().min(8).max(100),
  })
  .strict();

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "redeem-invitation", {
      limit: 10,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录并验证邮箱" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "邀请码格式错误" }, { status: 400 });
  }

  const result = await redeemInvitation({
    code: parsed.data.code,
    userId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "already_redeemed"
            ? "该邀请码已经被当前账号使用"
            : "邀请码无效、已过期或已达到使用上限",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    granted: true,
    entitlementId: result.entitlementId,
    alreadyRedeemed: result.alreadyRedeemed,
  });
}
