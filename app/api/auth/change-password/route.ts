import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { changePassword } from "@/app/lib/identity-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { passwordSchema } from "@/modules/identity/credentials";
import {
  createSession,
  getCurrentUser,
} from "@/providers/auth/session";

const schema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "新密码不能与原密码相同",
  });

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "change-password", {
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "密码格式错误" }, { status: 400 });
  }

  const updated = await changePassword({
    userId: user.id,
    ...parsed.data,
  });
  if (!updated) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 400 });
  }

  await createSession(updated);
  return NextResponse.json({ changed: true });
}
