import { NextResponse, type NextRequest } from "next/server";

import {
  initializeFirstAdmin,
  SiteInitializationError,
} from "@/app/lib/site-initialization-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { isAuthSecretConfigured } from "@/config/env";
import { initialAdminInputSchema } from "@/modules/site/initialization";
import { createSession } from "@/providers/auth/session";

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "initialize-first-admin", {
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    }));
  if (rejection) {
    return rejection;
  }

  if (!isAuthSecretConfigured()) {
    return NextResponse.json(
      { error: "请先配置有效的 AUTH_SECRET" },
      { status: 503 },
    );
  }

  const parsed = initialAdminInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "管理员初始化信息格式错误",
      },
      { status: 400 },
    );
  }

  try {
    const { email, setupToken } = parsed.data;
    const { admin, temporaryPassword } = await initializeFirstAdmin({
      email,
      setupToken,
    });
    let sessionCreated = false;
    try {
      await createSession(admin);
      sessionCreated = true;
    } catch {
      // The credential must still be delivered once if session creation fails;
      // otherwise the newly created administrator would be unrecoverable.
    }

    return NextResponse.json(
      {
        user: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        temporaryPassword,
        sessionCreated,
        next: sessionCreated
          ? "/admin/activate"
          : "/login?next=/admin/activate",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    if (error instanceof SiteInitializationError) {
      const status =
        error.code === "SETUP_TOKEN_REQUIRED"
          ? 503
          : error.code === "SETUP_TOKEN_INVALID"
            ? 403
            : 409;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "该邮箱已被使用，请更换邮箱或直接登录" },
        { status: 409 },
      );
    }
    throw error;
  }
}
