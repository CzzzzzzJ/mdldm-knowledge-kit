import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requestPasswordReset } from "@/app/lib/identity-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { emailSchema } from "@/modules/identity/credentials";

const schema = z.object({ email: emailSchema }).strict();

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "forgot-password", {
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

  await requestPasswordReset(parsed.data.email).catch((error) => {
    console.error("密码重置邮件发送失败", error);
  });

  return NextResponse.json(
    { message: "如果该邮箱存在，我们已经发送了重置邮件" },
    { status: 202 },
  );
}
