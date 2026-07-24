import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { resetPassword } from "@/app/lib/identity-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { passwordSchema } from "@/modules/identity/credentials";
import { createSession } from "@/providers/auth/session";

const schema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
  })
  .strict();

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "reset-password", {
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "重置链接或新密码格式错误" },
      { status: 400 },
    );
  }

  const user = await resetPassword(parsed.data);
  if (!user) {
    return NextResponse.json(
      { error: "重置链接无效、已使用或已过期" },
      { status: 400 },
    );
  }

  await createSession(user);
  return NextResponse.json({ reset: true });
}
