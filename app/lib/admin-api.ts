import { NextResponse, type NextRequest } from "next/server";

import { rejectCrossOriginMutation } from "@/app/lib/request-security";
import type { UserAccount } from "@/modules/identity";
import { requireAdmin } from "@/providers/auth/session";

type AdminAuthorization =
  | { ok: true; user: UserAccount }
  | { ok: false; response: NextResponse };

export async function authorizeAdminMutation(
  request: NextRequest,
): Promise<AdminAuthorization> {
  const rejection = rejectCrossOriginMutation(request);
  if (rejection) {
    return {
      ok: false,
      response: rejection,
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
