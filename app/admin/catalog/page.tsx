import { AdminCourseManager } from "@/components/admin-course-manager";
import {
  AdminShell,
  requireAdminPage,
} from "@/components/admin-shell";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const user = await requireAdminPage("/admin/catalog");

  await connectMongo();
  const [seriesRecords, courseRecords] = await Promise.all([
    SeriesModel.find().sort({ createdAt: -1 }).lean(),
    CourseModel.find().sort({ createdAt: -1 }).lean(),
  ]);

  return (
    <AdminShell
      active="catalog"
      currentUserEmail={user.email}
      description="在一个内容工作区里创建系列、组织课时、上传视频和资料，并完成发布。"
      title="内容管理"
    >
      <AdminCourseManager
        courses={courseRecords.map((course) => ({
          id: course._id.toString(),
          seriesId: course.seriesId.toString(),
          title: course.title,
          status: course.status,
          accessLevel: course.accessLevel,
          videoAssetId: course.videoAssetId?.toString() ?? null,
        }))}
        series={seriesRecords.map((item) => ({
          id: item._id.toString(),
          title: item.title,
          status: item.status,
        }))}
      />
    </AdminShell>
  );
}
