import { AdminProductManager } from "@/components/admin-product-manager";
import { getAdminProductWorkspace } from "@/app/lib/commerce-query-service";
import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireAdminPage("/admin/products");

  const workspace = await getAdminProductWorkspace();

  return (
    <AdminShell
      active="products"
      currentUserEmail={user.email}
      description="配置会员、单课和系列商品。价格、权益目标与期限保存在服务端，学员下单不能修改最终金额。"
      title="商品管理"
    >
      <AdminProductManager
        products={workspace.products}
        targets={workspace.targets}
      />
    </AdminShell>
  );
}
