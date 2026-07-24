import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { resendVerification } from "@/app/lib/identity-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { emailSchema } from "@/modules/identity/credentials";

const schema = z.object({ email: emailSchema }).strict();

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "resend-verification", {
      limit: 3,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "邮箱格式错误" }, { status: 400 });
  }

  await resendVerification(parsed.data.email).catch((error) => {
    console.error("重新发送验证邮件失败", error);
  });

  return NextResponse.json(
    { message: "如果该邮箱需要验证，我们已经发送了新邮件" },
    { status: 202 },
  );
}
