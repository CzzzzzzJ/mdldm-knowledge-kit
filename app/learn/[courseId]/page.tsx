import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import {
  MdldmAccessBadge,
  MdldmActionLink,
  MdldmEmptyState,
  MdldmFooter,
  MdldmPageIntro,
  MdldmPanel,
} from "@/components/mdldm-ui";
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
  await requirePublicSiteAccess();
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

  const [series, materials, allowed, seriesCourses] = await Promise.all([
    SeriesModel.findById(course.seriesId).lean(),
    CourseMaterialModel.find({ courseId: course._id })
      .sort({ position: 1 })
      .lean(),
    canCurrentUserAccessCourse(course),
    CourseModel.find({
      seriesId: course.seriesId,
      status: "published",
    })
      .sort({ position: 1 })
      .lean(),
  ]);

  const asset = course.videoAssetId
    ? await MediaAssetModel.findById(course.videoAssetId).lean()
    : null;
  const currentIndex = seriesCourses.findIndex(
    (item) => item._id.toString() === course._id.toString(),
  );
  const previousCourse =
    currentIndex > 0 ? seriesCourses[currentIndex - 1] : null;
  const nextCourse =
    currentIndex >= 0 && currentIndex < seriesCourses.length - 1
      ? seriesCourses[currentIndex + 1]
      : null;
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-10 sm:py-12">
        <MdldmPageIntro
          backHref={series ? `/series/${series.slug}` : "/courses"}
          backLabel="返回系列"
          description={course.summary}
          title={course.title}
        >
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <MdldmAccessBadge level={course.accessLevel} />
            <span className="font-bold text-[var(--muted)]">
              {series?.title ?? "课程"}
              {currentIndex >= 0
                ? ` / 第 ${currentIndex + 1} 课，共 ${seriesCourses.length} 课`
                : ""}
            </span>
          </div>
        </MdldmPageIntro>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <article>
            {!allowed ? (
              <MdldmEmptyState
                action={
                  <MdldmActionLink
                    href={`/login?next=/learn/${courseId}`}
                    variant="accent"
                  >
                    登录后继续
                  </MdldmActionLink>
                }
                description="登录后系统会检查全站会员、系列权益或单课购买记录。"
                title="这节课需要有效权益"
              />
            ) : asset?.status === "ready" ? (
              <MdldmPanel className="overflow-hidden bg-[var(--ink)]">
                <div className="border-b-2 border-[var(--ink)] bg-[var(--accent)] px-5 py-3 font-black text-[var(--accent-ink)]">
                  正在学习：{course.title}
                </div>
                <div className="p-3 sm:p-4">
                  <VideoPlayer
                    assetId={asset._id.toString()}
                    courseId={course._id.toString()}
                    title={course.title}
                  />
                </div>
              </MdldmPanel>
            ) : (
              <MdldmEmptyState
                description="发布前媒体校验会阻止缺少视频文件的课程上线。"
                title="视频尚未就绪"
              />
            )}

            {(previousCourse || nextCourse) && (
              <nav
                aria-label="课时切换"
                className="mt-7 grid gap-4 sm:grid-cols-2"
              >
                {previousCourse ? (
                  <Link
                    className="focus-ring md-pressable rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-5 shadow-[4px_4px_0_var(--hard-shadow)]"
                    href={`/learn/${previousCourse._id.toString()}`}
                  >
                    <span className="text-sm font-black text-[var(--muted)]">
                      上一课
                    </span>
                    <span className="mt-1 block font-black">
                      {previousCourse.title}
                    </span>
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
                {nextCourse ? (
                  <Link
                    className="focus-ring md-pressable rounded-2xl border-2 border-[var(--ink)] bg-[var(--accent)] p-5 shadow-[4px_4px_0_var(--hard-shadow)] sm:text-right"
                    href={`/learn/${nextCourse._id.toString()}`}
                  >
                    <span className="text-sm font-black">下一课</span>
                    <span className="mt-1 block font-black">
                      {nextCourse.title}
                    </span>
                  </Link>
                ) : null}
              </nav>
            )}
          </article>

          <aside className="grid content-start gap-5">
            <MdldmPanel className="p-5">
              <h2 className="text-lg font-black">系列目录</h2>
              <p className="mt-2 text-sm font-bold text-[var(--muted)]">
                {Math.max(0, currentIndex + 1)} / {seriesCourses.length} 节
              </p>
              <nav className="mt-4 grid gap-3" aria-label="系列课程">
                {seriesCourses.map((item, index) => {
                  const isCurrent =
                    item._id.toString() === course._id.toString();
                  return (
                    <Link
                      aria-current={isCurrent ? "page" : undefined}
                      className={
                        isCurrent
                          ? "focus-ring rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-3 text-sm font-black shadow-[3px_3px_0_var(--hard-shadow)]"
                          : "focus-ring rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-sm font-bold hover:bg-[var(--surface-strong)]"
                      }
                      href={`/learn/${item._id.toString()}`}
                      key={item._id.toString()}
                    >
                      <span className="mr-2 font-mono">{index + 1}</span>
                      {item.title}
                    </Link>
                  );
                })}
              </nav>
            </MdldmPanel>

            <MdldmPanel className="p-5">
              <h2 className="text-lg font-black">课程资料</h2>
              {!allowed ? (
                <p className="mt-3 text-sm font-medium text-[var(--muted)]">
                  获得课程权益后显示资料。
                </p>
              ) : materials.length === 0 ? (
                <p className="mt-3 text-sm font-medium text-[var(--muted)]">
                  暂无资料
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {materials.map((material) => (
                    <a
                      className="focus-ring md-pressable rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-sm font-black shadow-[3px_3px_0_var(--hard-shadow)]"
                      href={`/api/materials/${material._id.toString()}/download`}
                      key={material._id.toString()}
                    >
                      {material.title}
                    </a>
                  ))}
                </div>
              )}
            </MdldmPanel>
          </aside>
        </div>
      </main>
      <MdldmFooter
        siteName={site.name}
        supportEmail={site.creator.supportEmail}
      />
    </>
  );
}
