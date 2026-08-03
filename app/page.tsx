import Link from "next/link";
import type { Types } from "mongoose";

import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import { getResolvedSiteSettings } from "@/app/lib/site-settings-service";
import {
  MdldmAccessBadge,
  MdldmActionLink,
  MdldmCourseCover,
  MdldmFooter,
  MdldmPanel,
  MdldmSectionHeading,
  MdldmSeriesCard,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import type { SiteConfig } from "@/modules/site";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  type CourseRecord,
  SeriesModel,
  type SeriesRecord,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

type SeriesDocument = SeriesRecord & { _id: Types.ObjectId };
type CourseDocument = CourseRecord & { _id: Types.ObjectId };

const accessLabels: Record<CourseRecord["accessLevel"], string> = {
  public: "公开",
  registered: "注册可学",
  member: "会员",
  course: "单课",
  series: "系列权益",
};

function toSiteConfig(
  settings: Awaited<ReturnType<typeof getResolvedSiteSettings>>,
): SiteConfig {
  return {
    name: settings.siteName,
    description: settings.description,
    url: settings.url,
    locale: settings.locale,
    creator: {
      name: settings.creatorName,
      supportEmail: settings.supportEmail,
    },
  };
}

export default async function HomePage() {
  await requirePublicSiteAccess();
  const settings = await getResolvedSiteSettings();
  const site = toSiteConfig(settings);
  let featuredSeries: SeriesDocument[] = [];
  let latestCourses: CourseDocument[] = [];
  let latestCourseSeries: SeriesDocument[] = [];

  try {
    await connectMongo();
    [featuredSeries, latestCourses] = await Promise.all([
      SeriesModel.find({ status: "published" })
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean(),
      CourseModel.find({ status: "published" })
        .sort({ publishedAt: -1, updatedAt: -1 })
        .limit(4)
        .lean(),
    ]);
    latestCourseSeries = await SeriesModel.find({
      _id: { $in: latestCourses.map((course) => course.seriesId) },
      status: "published",
    }).lean();
  } catch {
    featuredSeries = [];
    latestCourses = [];
    latestCourseSeries = [];
  }

  const seriesById = new Map(
    [...featuredSeries, ...latestCourseSeries].map((series) => [
      series._id.toString(),
      series,
    ]),
  );
  const heroSeries = featuredSeries[0];

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="bg-dot-pattern border-b-2 border-[var(--ink)]">
          <div className="page-shell grid min-h-[calc(100dvh-4.25rem)] items-center gap-10 py-10 md:grid-cols-[0.9fr_1.1fr] md:py-14 lg:gap-14">
            <div className="max-w-2xl">
              <h1 className="max-w-[12ch] text-4xl font-black leading-[1.02] tracking-[-0.06em] sm:text-5xl lg:text-6xl">
                {settings.homeTitle}
              </h1>
              <p className="mt-6 max-w-[36rem] text-lg font-medium leading-8 text-[var(--muted)]">
                {settings.homeSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <MdldmActionLink href="/courses" variant="accent">
                  开始学习
                </MdldmActionLink>
                <MdldmActionLink href="/pricing" variant="secondary">
                  查看学习方案
                </MdldmActionLink>
              </div>
            </div>

            <MdldmPanel className="relative overflow-hidden bg-[var(--surface)]">
              <div
                aria-hidden="true"
                className="absolute -right-5 -top-5 size-20 rounded-full border-2 border-[var(--ink)] bg-[var(--brand-blue)] shadow-[4px_4px_0_var(--hard-shadow)]"
              />
              <div className="border-b-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-black text-[var(--surface)]">
                {heroSeries ? "本期推荐" : "知识站从这里开始"}
              </div>
              <MdldmCourseCover
                compact
                eager
                imageUrl={
                  heroSeries?.coverImageUrl || settings.heroImageUrl || null
                }
                title={heroSeries?.title || settings.siteName}
              />
              <div className="grid gap-4 border-t-2 border-[var(--ink)] p-6 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.035em]">
                    {heroSeries?.title || "把内容整理成可学习的路径"}
                  </h2>
                  <p className="mt-2 max-w-xl font-medium leading-7 text-[var(--muted)]">
                    {heroSeries?.description ||
                      "发布系列、课程与资料，让读者从浏览进入持续学习。"}
                  </p>
                </div>
                <MdldmActionLink
                  href={heroSeries ? `/series/${heroSeries.slug}` : "/courses"}
                  variant="primary"
                >
                  {heroSeries ? "查看系列" : "浏览课程"}
                </MdldmActionLink>
              </div>
            </MdldmPanel>
          </div>
        </section>

        <section className="border-b-2 border-[var(--ink)] bg-[var(--accent)] py-6">
          <div className="page-shell grid gap-4 font-black sm:grid-cols-3">
            <p>公开内容建立信任</p>
            <p>会员与单课两种权益</p>
            <p>学习进度持续保存</p>
          </div>
        </section>

        <section className="page-shell py-16 sm:py-20">
          <MdldmSectionHeading
            action={
              <MdldmActionLink href="/courses" variant="quiet">
                浏览全部课程
              </MdldmActionLink>
            }
            description="先理解完整路径，再进入单节课程动手。"
            title="从一个完整系列开始"
          />

          {featuredSeries.length === 0 ? (
            <MdldmPanel className="mt-9 p-8">
              <h3 className="text-xl font-black">课程正在准备中</h3>
              <p className="mt-2 font-medium text-[var(--muted)]">
                新的课程系列会陆续发布在这里。
              </p>
            </MdldmPanel>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {featuredSeries.map((series, index) => (
                <MdldmSeriesCard
                  accessLevel={series.accessLevel}
                  category={series.category}
                  coverImageUrl={series.coverImageUrl}
                  description={series.description}
                  featured={index === 0}
                  href={`/series/${series.slug}`}
                  key={series._id.toString()}
                  tags={series.tags}
                  title={series.title}
                />
              ))}
            </div>
          )}
        </section>

        <section className="border-y-2 border-[var(--ink)] bg-[var(--surface-strong)] py-16 sm:py-20">
          <div className="page-shell grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="max-w-xl">
              <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                最近更新
              </h2>
              <p className="mt-4 font-medium leading-7 text-[var(--muted)]">
                回来看新课程，也可以从学习中心继续上次的进度。
              </p>
              <MdldmActionLink
                className="mt-6"
                href="/account"
                variant="secondary"
              >
                进入学习中心
              </MdldmActionLink>
            </div>

            {latestCourses.length === 0 ? (
              <MdldmPanel className="p-8">
                <p className="font-bold text-[var(--muted)]">
                  暂时没有已发布课程。
                </p>
              </MdldmPanel>
            ) : (
              <div className="grid gap-4">
                {latestCourses.map((course) => {
                  const series = seriesById.get(course.seriesId.toString());
                  return (
                    <Link
                      className="focus-ring md-pressable grid gap-4 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-5 shadow-[4px_4px_0_var(--hard-shadow)] sm:grid-cols-[1fr_auto] sm:items-center"
                      href={`/learn/${course._id.toString()}`}
                      key={course._id.toString()}
                    >
                      <span>
                        <span className="flex flex-wrap items-center gap-2">
                          <MdldmAccessBadge level={course.accessLevel} />
                          <span className="text-sm font-bold text-[var(--muted)]">
                            {series?.title ?? "课程"}
                          </span>
                        </span>
                        <span className="mt-3 block text-xl font-black tracking-[-0.025em]">
                          {course.title}
                        </span>
                        <span className="mt-2 line-clamp-2 block text-sm font-medium leading-6 text-[var(--muted)]">
                          {course.summary}
                        </span>
                      </span>
                      <span className="font-black underline decoration-2 underline-offset-4">
                        {accessLabels[course.accessLevel]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="page-shell py-16 sm:py-20">
          <MdldmPanel className="grid gap-8 overflow-hidden bg-[var(--accent)] p-7 md:grid-cols-[0.8fr_1.2fr] md:p-10">
            <div>
              <p className="md-badge bg-[var(--surface)]">关于创作者</p>
              <div className="mt-5 flex items-center gap-4">
                {settings.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    alt={settings.creatorName}
                    className="size-16 rounded-2xl border-2 border-[var(--ink)] object-cover shadow-[4px_4px_0_var(--hard-shadow)]"
                    height={64}
                    loading="lazy"
                    src={settings.avatarUrl}
                    width={64}
                  />
                ) : null}
                <h2 className="text-3xl font-black tracking-[-0.04em]">
                  {settings.creatorName}
                </h2>
              </div>
            </div>
            <div className="max-w-3xl">
              <p className="text-lg font-bold leading-8 text-[var(--accent-ink)]">
                {settings.creatorBio || settings.description}
              </p>
              {settings.socialLinks.length > 0 ? (
                <nav
                  aria-label="创作者链接"
                  className="mt-6 flex flex-wrap gap-3"
                >
                  {settings.socialLinks.map((link) => (
                    <a
                      className="md-action md-action-secondary"
                      href={link.url}
                      key={`${link.label}-${link.url}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              ) : null}
            </div>
          </MdldmPanel>
        </section>
      </main>

      <MdldmFooter
        siteName={settings.siteName}
        supportEmail={settings.supportEmail}
      />
    </>
  );
}
