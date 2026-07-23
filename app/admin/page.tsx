import { redirect } from "next/navigation";

import { AdminCourseManager } from "@/components/admin-course-manager";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login?next=/admin");
  }

  await connectMongo();
  const [seriesRecords, courseRecords] = await Promise.all([
    SeriesModel.find().sort({ createdAt: -1 }).lean(),
    CourseModel.find().sort({ createdAt: -1 }).lean(),
  ]);

  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-12">
        <p className="font-mono text-xs text-[var(--accent)]">ADMIN</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
          课程交付后台
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          当前管理员：{user.email}
        </p>

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
      </main>
    </>
  );
}
