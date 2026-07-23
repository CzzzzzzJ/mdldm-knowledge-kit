import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { clearRateLimit, consumeRateLimit } from "@/modules/identity/rate-limit";
import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";
import { createSession } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { UserModel } from "@/providers/database/mongodb/models/user";

const loginSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const expectedOrigin = getExpectedRequestOrigin(
    request.headers,
    request.nextUrl.protocol,
  );
  if (
    !expectedOrigin ||
    !isSameOriginRequest(request.headers.get("origin"), expectedOrigin)
  ) {
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  const rateLimitKey = `login:${clientKey}`;
  const limit = consumeRateLimit(rateLimitKey, {
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

  await createSession(user);
  clearRateLimit(rateLimitKey);

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
