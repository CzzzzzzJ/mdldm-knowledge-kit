import { AdminOrderManager } from "@/components/admin-order-manager";
import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const user = await requireAdminPage("/admin/orders");

  return (
    <AdminShell
      active="orders"
      currentUserEmail={user.email}
      description="集中查看交易状态、确认人工支付，并处理订单已经支付但权益尚未发放的情况。"
      title="订单管理"
    >
      <AdminOrderManager />
    </AdminShell>
  );
}
