import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  getResolvedSiteSettings,
  updateSiteSettings,
} from "@/app/lib/site-settings-service";
import { siteSettingsPatchSchema } from "@/modules/site/settings";
import { requireAdmin } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  return NextResponse.json(
    { settings: await getResolvedSiteSettings() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = siteSettingsPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "站点设置格式错误",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const settings = await updateSiteSettings(parsed.data);
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "站点设置保存失败，请检查数据库连接后重试" },
      { status: 500 },
    );
  }
}
