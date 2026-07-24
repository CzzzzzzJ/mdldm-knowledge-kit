import { exportAdministrativeData } from "@/app/lib/operations-service";
import { requireAdmin } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = JSON.stringify(await exportAdministrativeData(), null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="mdldm-admin-export-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
