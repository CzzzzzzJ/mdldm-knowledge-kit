import { NextResponse, type NextRequest } from "next/server";

import type { UserAccount } from "@/modules/identity";
import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";
import { requireAdmin } from "@/providers/auth/session";

type AdminAuthorization =
  | { ok: true; user: UserAccount }
  | { ok: false; response: NextResponse };

export async function authorizeAdminMutation(
  request: NextRequest,
): Promise<AdminAuthorization> {
  const expectedOrigin = getExpectedRequestOrigin(
    request.headers,
    request.nextUrl.protocol,
  );
  if (
    !expectedOrigin ||
    !isSameOriginRequest(request.headers.get("origin"), expectedOrigin)
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "请求来源无效" }, { status: 403 }),
    };
  }

  try {
    return { ok: true, user: await requireAdmin() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "需要管理员权限" }, { status: 403 }),
    };
  }
}
