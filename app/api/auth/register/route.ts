import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registerUser } from "@/app/lib/identity-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import {
  emailSchema,
  passwordSchema,
} from "@/modules/identity/credentials";

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "register", {
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  const parsed = registerSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "注册信息格式错误，且不能指定用户角色" },
      { status: 400 },
    );
  }

  try {
    const { user, emailSent } = await registerUser(parsed.data);
    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "该邮箱已注册，请直接登录或找回密码" },
        { status: 409 },
      );
    }
    throw error;
  }
}
