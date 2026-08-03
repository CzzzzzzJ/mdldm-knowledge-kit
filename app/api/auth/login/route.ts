import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authenticateUser } from "@/app/lib/identity-service";
import {
  getClientAddress,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { emailSchema } from "@/modules/identity/credentials";
import { createSession } from "@/providers/auth/session";
import {
  clearRateLimit,
  consumeRateLimit,
} from "@/providers/rate-limit/mongodb";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
}).strict();

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) {
    return originRejection;
  }

  const clientKey = getClientAddress(request);
  const rateLimitKey = `login:${clientKey}`;
  const limit = await consumeRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 15 * 60 * 1_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "登录尝试过多，请稍后再试" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "邮箱或密码格式错误" }, { status: 400 });
  }

  const authentication = await authenticateUser(parsed.data);
  if (!authentication.ok && authentication.reason === "invalid") {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  if (!authentication.ok) {
    return NextResponse.json(
      { error: "请先完成邮箱验证", code: "EMAIL_NOT_VERIFIED" },
      { status: 403 },
    );
  }

  const { user } = authentication;
  await createSession(user);
  await clearRateLimit(rateLimitKey);

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      requiresPasswordChange: Boolean(user.requiresPasswordChange),
    },
  });
}
