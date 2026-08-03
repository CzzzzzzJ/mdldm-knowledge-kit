import { NextResponse, type NextRequest } from "next/server";

import {
  activateInitialAdminPassword,
} from "@/app/lib/site-initialization-service";
import {
  applyRequestRateLimit,
  rejectCrossOriginMutation,
} from "@/app/lib/request-security";
import { initialAdminActivationInputSchema } from "@/modules/site/initialization";
import {
  createSession,
  getCurrentUser,
} from "@/providers/auth/session";

export async function POST(request: NextRequest) {
  const rejection =
    rejectCrossOriginMutation(request) ??
    (await applyRequestRateLimit(request, "activate-first-admin", {
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
  if (user.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  if (!user.requiresPasswordChange) {
    return NextResponse.json(
      { error: "管理员账号已经完成激活" },
      { status: 409 },
    );
  }

  const parsed = initialAdminActivationInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "密码格式错误" },
      { status: 400 },
    );
  }

  const result = await activateInitialAdminPassword({
    adminId: user.id,
    password: parsed.data.password,
  });
  if (result.status === "password_unchanged") {
    return NextResponse.json(
      { error: "正式密码不能与临时密码相同" },
      { status: 400 },
    );
  }
  if (result.status !== "activated") {
    return NextResponse.json(
      { error: "账号已完成激活，请重新登录" },
      { status: 409 },
    );
  }

  let sessionCreated = false;
  try {
    await createSession(result.admin);
    sessionCreated = true;
  } catch {
    // The password rotation already succeeded. Let the administrator sign in
    // with the new password instead of reporting a misleading failed update.
  }
  return NextResponse.json(
    {
      activated: true,
      sessionCreated,
      next: sessionCreated ? "/admin/setup" : "/login?next=/admin/setup",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}
