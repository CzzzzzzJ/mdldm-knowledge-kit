import { NextResponse } from "next/server";

import { getAgentContextReport } from "@/app/lib/agent-context-service";
import { requireAdmin } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  try {
    return NextResponse.json(await getAgentContextReport(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error: "AGENT_CONTEXT_UNAVAILABLE",
        message: "当前无法读取脱敏生命周期状态，请先检查配置与数据库连接。",
      },
      { status: 503 },
    );
  }
}
