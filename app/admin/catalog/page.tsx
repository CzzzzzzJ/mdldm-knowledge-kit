import { AdminCourseManager } from "@/components/admin-course-manager";
import { listAdminCatalog } from "@/app/lib/catalog-query-service";
import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const user = await requireAdminPage("/admin/catalog");

  const catalog = await listAdminCatalog();

  return (
    <AdminShell
      active="catalog"
      currentUserEmail={user.email}
      description="在一个内容工作区里创建系列、组织课时、上传视频和资料，并完成发布。"
      title="内容管理"
    >
      <AdminCourseManager
        courses={catalog.courses.map((course) => ({
          id: course.id,
          seriesId: course.seriesId,
          title: course.title,
          status: course.status,
          accessLevel: course.accessLevel,
          contentType: course.contentType,
          hasArticleBody: course.hasArticleBody,
          videoAssetId: course.videoAssetId?.toString() ?? null,
        }))}
        series={catalog.series.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
        }))}
      />
    </AdminShell>
  );
}
