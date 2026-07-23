import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import { SiteHeader } from "@/components/site-header";
import { VideoPlayer } from "@/components/video-player";
import { getSiteConfig } from "@/config/site.config";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseMaterialModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!isValidObjectId(courseId)) {
    notFound();
  }

  await connectMongo();
  const course = await CourseModel.findOne({
    _id: courseId,
    status: "published",
  });
  if (!course) {
    notFound();
  }

  const [series, materials, allowed] = await Promise.all([
    SeriesModel.findById(course.seriesId).lean(),
    CourseMaterialModel.find({ courseId: course._id })
      .sort({ position: 1 })
      .lean(),
    canCurrentUserAccessCourse(course),
  ]);

  const asset = course.videoAssetId
    ? await MediaAssetModel.findById(course.videoAssetId).lean()
    : null;
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-12">
        <Link
          className="focus-ring rounded-md text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          href="/courses"
        >
          返回课程
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <article>
            <p className="font-mono text-xs text-[var(--accent)]">
              {series?.title ?? "课程"}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[var(--muted)]">
              {course.summary}
            </p>

            <div className="mt-9">
              {!allowed ? (
                <div className="surface p-8">
                  <h2 className="text-xl font-semibold">这节课需要有效权益</h2>
                  <p className="mt-2 text-[var(--muted)]">
                    登录后系统会检查全站会员或单课购买记录。
                  </p>
                  <Link
                    className="focus-ring mt-5 inline-block rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-ink)]"
                    href={`/login?next=/learn/${courseId}`}
                  >
                    登录
                  </Link>
                </div>
              ) : asset?.status === "ready" ? (
                <VideoPlayer
                  assetId={asset._id.toString()}
                  courseId={course._id.toString()}
                  title={course.title}
                />
              ) : (
                <div className="surface p-8">
                  <h2 className="text-xl font-semibold">视频尚未就绪</h2>
                  <p className="mt-2 text-[var(--muted)]">
                    发布前媒体校验会阻止缺少视频文件的课程上线。
                  </p>
                </div>
              )}
            </div>
          </article>

          <aside>
            <div className="surface p-5">
              <h2 className="font-semibold">课程资料</h2>
              {materials.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">暂无资料</p>
              ) : (
                <div className="mt-4 grid gap-2">
                  {materials.map((material) => (
                    <a
                      className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--page)] px-4 py-3 text-sm font-medium hover:border-[var(--accent)]"
                      href={`/api/materials/${material._id.toString()}/download`}
                      key={material._id.toString()}
                    >
                      {material.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
