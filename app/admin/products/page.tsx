import { AdminProductManager } from "@/components/admin-product-manager";
import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { ProductModel } from "@/providers/database/mongodb/models/commerce";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireAdminPage("/admin/products");

  await connectMongo();
  const [productRecords, courseRecords, seriesRecords] = await Promise.all([
    ProductModel.find().sort({ active: -1, createdAt: -1 }).lean(),
    CourseModel.find().sort({ createdAt: -1 }).select("title status").lean(),
    SeriesModel.find().sort({ createdAt: -1 }).select("title status").lean(),
  ]);

  return (
    <AdminShell
      active="products"
      currentUserEmail={user.email}
      description="配置会员、单课和系列商品。价格、权益目标与期限保存在服务端，学员下单不能修改最终金额。"
      title="商品管理"
    >
      <AdminProductManager
        products={productRecords.map((product) => ({
          id: product._id.toString(),
          sku: product.sku,
          title: product.title,
          description: product.description,
          amountInMinorUnits: product.amountInMinorUnits,
          currency: product.currency,
          entitlementType: product.entitlementType,
          entitlementTargetId: product.entitlementTargetId,
          entitlementDurationDays: product.entitlementDurationDays,
          active: product.active,
        }))}
        targets={{
          courses: courseRecords.map((course) => ({
            id: course._id.toString(),
            title: course.title,
            status: course.status,
          })),
          series: seriesRecords.map((series) => ({
            id: series._id.toString(),
            title: series.title,
            status: series.status,
          })),
        }}
      />
    </AdminShell>
  );
}
