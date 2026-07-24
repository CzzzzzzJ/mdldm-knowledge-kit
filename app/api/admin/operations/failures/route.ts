import { NextResponse } from "next/server";

import { listOpenOperationalFailures } from "@/app/lib/operations-service";
import { requireAdmin } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  return NextResponse.json(
    { failures: await listOpenOperationalFailures() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
