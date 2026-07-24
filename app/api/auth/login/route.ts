import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getClientAddress,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { emailSchema } from "@/modules/identity/credentials";
import { createSession } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { UserModel } from "@/providers/database/mongodb/models/user";
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

  await connectMongo();
  const user = await UserModel.findOne({ email: parsed.data.email }).select(
    "+passwordHash",
  );

  if (
    !user ||
    user.status !== "active" ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "请先完成邮箱验证", code: "EMAIL_NOT_VERIFIED" },
      { status: 403 },
    );
  }

  await createSession(user);
  await clearRateLimit(rateLimitKey);

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
