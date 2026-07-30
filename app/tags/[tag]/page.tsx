import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  MdldmActionLink,
  MdldmEmptyState,
  MdldmFooter,
  MdldmPageIntro,
  MdldmSeriesCard,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import {
  createLiteralSearchRegExp,
  decodeTaxonomyPathSegment,
} from "@/modules/catalog";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export const dynamic = "force-dynamic";

function readTag(value: string): string | null {
  const tag = decodeTaxonomyPathSegment(value);
  return tag && tag.length <= 40 ? tag : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const tag = readTag(rawTag);

  return tag
    ? {
        title: `${tag}课程`,
        description: `浏览标记为${tag}的已发布课程系列。`,
      }
    : { title: "课程标签" };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = readTag(rawTag);
  if (!tag) {
    notFound();
  }

  const pattern = createLiteralSearchRegExp(tag, { exact: true });
  if (!pattern) {
    notFound();
  }

  await connectMongo();
  const series = await SeriesModel.find({
    status: "published",
    tags: pattern,
  })
    .sort({ createdAt: -1 })
    .lean();
  const seriesIds = series.map((item) => item._id);
  const courseCounts =
    seriesIds.length === 0
      ? []
      : await CourseModel.aggregate<{ _id: unknown; count: number }>([
          {
            $match: {
              seriesId: { $in: seriesIds },
              status: "published",
            },
          },
          { $group: { _id: "$seriesId", count: { $sum: 1 } } },
        ]);
  const countBySeries = new Map(
    courseCounts.map((item) => [String(item._id), item.count]),
  );
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="bg-grid-pattern border-b-2 border-[var(--ink)] py-12 sm:py-16">
          <div className="page-shell">
            <MdldmPageIntro
              backHref="/courses"
              backLabel="返回全部课程"
              description="这里汇总了使用这个标签的全部已发布系列。"
              title={tag}
            />
          </div>
        </section>

        <section className="page-shell py-12 sm:py-16">
          {series.length === 0 ? (
            <MdldmEmptyState
              action={
                <MdldmActionLink href="/courses" variant="accent">
                  浏览全部课程
                </MdldmActionLink>
              }
              description="标签可能已经调整，可以返回课程页继续浏览。"
              title="暂时没有相关课程"
            />
          ) : (
            <div className="grid gap-7 lg:grid-cols-2">
              {series.map((item) => (
                <MdldmSeriesCard
                  accessLevel={item.accessLevel}
                  category={item.category}
                  courseCount={countBySeries.get(item._id.toString()) ?? 0}
                  coverImageUrl={item.coverImageUrl}
                  description={item.description}
                  href={`/series/${item.slug}`}
                  key={item._id.toString()}
                  tags={item.tags}
                  title={item.title}
                />
              ))}
            </div>
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
