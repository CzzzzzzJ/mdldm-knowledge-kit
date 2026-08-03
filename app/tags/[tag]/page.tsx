import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { listPublishedSeriesByTag } from "@/app/lib/catalog-query-service";
import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import {
  MdldmActionLink,
  MdldmEmptyState,
  MdldmFooter,
  MdldmPageIntro,
  MdldmSeriesCard,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { decodeTaxonomyPathSegment } from "@/modules/catalog";

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
  await requirePublicSiteAccess();
  const { tag: rawTag } = await params;
  const tag = readTag(rawTag);
  if (!tag) {
    notFound();
  }

  const series = await listPublishedSeriesByTag(tag);
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
                  courseCount={item.courseCount}
                  coverImageUrl={item.coverImageUrl}
                  description={item.description}
                  href={`/series/${item.slug}`}
                  key={item.id}
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
