import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";
import { AdminOperationsPanel } from "@/components/admin-operations-panel";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const user = await requireAdminPage("/admin/system");

  return (
    <AdminShell
      active="system"
      currentUserEmail={user.email}
      description="检查运营指标、第三方 Provider 和失败队列；系统异常时从这里获得第一条排查线索。"
      title="系统与故障"
    >
      <AdminOperationsPanel />
    </AdminShell>
  );
}
