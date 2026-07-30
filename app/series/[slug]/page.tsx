import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MdldmAccessBadge,
  MdldmActionLink,
  MdldmCourseCover,
  MdldmEmptyState,
  MdldmFooter,
  MdldmPageIntro,
  MdldmPanel,
  MdldmSectionHeading,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import type { AccessLevel } from "@/modules/catalog";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

const accessLabels: Record<AccessLevel, string> = {
  public: "全部公开",
  registered: "注册后学习",
  member: "会员专享",
  course: "支持单课购买",
  series: "需要系列权益",
};

function isValidSeriesSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= 120 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)
  );
}

async function findPublishedSeries(slug: string) {
  if (!isValidSeriesSlug(slug)) {
    return null;
  }

  await connectMongo();
  return SeriesModel.findOne({ slug, status: "published" }).lean();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const series = await findPublishedSeries(slug);
    return series
      ? {
          title: series.title,
          description: series.description.slice(0, 160),
        }
      : { title: "系列未找到" };
  } catch {
    return { title: "课程系列" };
  }
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await findPublishedSeries(slug);
  if (!series) {
    notFound();
  }

  const courses = await CourseModel.find({
    seriesId: series._id,
    status: "published",
  })
    .sort({ position: 1 })
    .lean();
  const site = getSiteConfig();
  const tags = series.tags ?? [];
  const firstCourse = courses[0];

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="bg-dot-pattern border-b-2 border-[var(--ink)]">
          <div className="page-shell grid gap-9 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center">
            <MdldmPageIntro
              backHref="/courses"
              backLabel="返回全部课程"
              description={series.description}
              title={series.title}
            >
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <MdldmAccessBadge level={series.accessLevel} />
                <span className="font-bold text-[var(--muted)]">
                  {series.category || "课程系列"} / {courses.length} 节课
                </span>
              </div>

              {tags.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link
                      className="focus-ring md-tag"
                      href={`/tags/${encodeURIComponent(tag)}`}
                      key={tag}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}

              {firstCourse ? (
                <MdldmActionLink
                  className="mt-8"
                  href={`/learn/${firstCourse._id.toString()}`}
                  variant="accent"
                >
                  开始学习
                </MdldmActionLink>
              ) : null}
            </MdldmPageIntro>

            <MdldmPanel className="overflow-hidden">
              <MdldmCourseCover
                eager
                imageUrl={series.coverImageUrl}
                title={series.title}
              />
              <div className="border-t-2 border-[var(--ink)] bg-[var(--surface)] p-5">
                <p className="font-black">{accessLabels[series.accessLevel]}</p>
                <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                  每节课都会标明具体访问方式。
                </p>
              </div>
            </MdldmPanel>
          </div>
        </section>

        <section className="page-shell py-12 sm:py-16">
          <MdldmSectionHeading
            description="按顺序学习，也可以直接打开你需要的课时。"
            title="课程目录"
          />

          {courses.length === 0 ? (
            <MdldmEmptyState
              className="mt-8"
              description="新课时发布后，目录会自动更新。"
              title="课时正在准备中"
            />
          ) : (
            <ol className="mt-8 grid gap-4">
              {courses.map((course, index) => (
                <li key={course._id.toString()}>
                  <Link
                    className="focus-ring md-pressable grid gap-4 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-5 shadow-[4px_4px_0_var(--hard-shadow)] sm:grid-cols-[3rem_1fr_auto] sm:items-center"
                    href={`/learn/${course._id.toString()}`}
                  >
                    <span className="grid size-10 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--accent)] font-mono text-sm font-black">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="text-lg font-black">{course.title}</span>
                      <span className="mt-1 block text-sm font-medium leading-6 text-[var(--muted)]">
                        {course.summary}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 whitespace-nowrap">
                      <MdldmAccessBadge level={course.accessLevel} />
                      <span className="hidden font-black underline decoration-2 underline-offset-4 sm:inline">
                        打开
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
      <MdldmFooter
        siteName={site.name}
        supportEmail={site.creator.supportEmail}
      />
    </>
  );
}
