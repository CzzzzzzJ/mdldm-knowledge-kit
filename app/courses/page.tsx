import type { Metadata } from "next";
import Link from "next/link";

import { browsePublishedSeries } from "@/app/lib/catalog-query-service";
import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import {
  MdldmActionLink,
  MdldmButton,
  MdldmEmptyState,
  MdldmFooter,
  MdldmPageIntro,
  MdldmPanel,
  MdldmSeriesCard,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { parseDiscoveryFilters } from "@/modules/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "课程",
  description: "按主题、分类或标签发现已发布的课程系列。",
};

type SearchParams = Record<string, string | string[] | undefined>;

function createCoursesHref(
  filters: {
    query?: string;
    category?: string;
    tag?: string;
  } = {},
): string {
  const params = new URLSearchParams();
  if (filters.query) {
    params.set("q", filters.query);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.tag) {
    params.set("tag", filters.tag);
  }
  const query = params.toString();
  return query ? `/courses?${query}` : "/courses";
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePublicSiteAccess();
  const site = getSiteConfig();
  const parsedFilters = parseDiscoveryFilters(await searchParams);
  const { query, category, tag } = parsedFilters.filters;
  let series: Awaited<ReturnType<typeof browsePublishedSeries>>["series"] = [];
  let categories: string[] = [];
  let tags: string[] = [];
  let loadFailed = false;

  try {
    const result = await browsePublishedSeries({ query, category, tag });
    series = result.series;
    categories = result.categories;
    tags = result.tags;
  } catch {
    loadFailed = true;
  }

  const hasFilters = Boolean(query || category || tag);

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="bg-grid-pattern border-b-2 border-[var(--ink)] py-12 sm:py-16">
          <div className="page-shell">
            <MdldmPageIntro
              description="搜索主题，或通过分类和标签浏览完整系列。"
              title="找到适合你的课程"
            />

            <MdldmPanel className="mt-8 grid gap-5 bg-[var(--accent)] p-5 sm:p-6">
              <form
                action="/courses"
                className="grid gap-4 sm:grid-cols-[1fr_12rem_auto]"
              >
                <label className="grid gap-2 text-sm font-black">
                  搜索课程
                  <input
                    className="md-field font-medium"
                    defaultValue={query}
                    maxLength={80}
                    name="q"
                    placeholder="输入课程或主题"
                    type="search"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black">
                  分类
                  <select
                    className="md-field font-medium"
                    defaultValue={category}
                    name="category"
                  >
                    <option value="">全部分类</option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                {tag ? <input name="tag" type="hidden" value={tag} /> : null}
                <MdldmButton className="self-end" type="submit" variant="primary">
                  查找
                </MdldmButton>
              </form>

              {tags.length > 0 ? (
                <div
                  className="flex flex-wrap items-center gap-2"
                  aria-label="课程标签"
                >
                  <span className="mr-1 text-sm font-black">热门标签</span>
                  {tags.map((item) => {
                    const selected =
                      item.toLocaleLowerCase() === tag.toLocaleLowerCase();
                    return (
                      <Link
                        aria-current={selected ? "page" : undefined}
                        className={
                          selected
                            ? "focus-ring md-tag bg-[var(--ink)] text-[var(--surface)]"
                            : "focus-ring md-tag"
                        }
                        href={createCoursesHref({
                          query,
                          category,
                          tag: selected ? "" : item,
                        })}
                        key={item}
                      >
                        {item}
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {hasFilters ? (
                <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                  <span>
                    当前条件：
                    {[query, category, tag].filter(Boolean).join(" / ")}
                  </span>
                  <Link className="md-text-link" href="/courses">
                    清除筛选
                  </Link>
                </div>
              ) : null}

              {parsedFilters.invalidFields.length > 0 ? (
                <p className="text-sm font-bold text-[var(--warning)]" role="status">
                  部分查询条件过长或格式不正确，已经忽略。
                </p>
              ) : null}
            </MdldmPanel>
          </div>
        </section>

        <section className="page-shell py-12 sm:py-16">
          {loadFailed ? (
            <MdldmEmptyState
              description="请稍后刷新页面，或联系站长检查数据库连接。"
              title="课程暂时无法读取"
            />
          ) : series.length === 0 ? (
            <MdldmEmptyState
              action={
                hasFilters ? (
                  <MdldmActionLink href="/courses" variant="accent">
                    查看全部课程
                  </MdldmActionLink>
                ) : undefined
              }
              description={
                hasFilters
                  ? "换一个关键词，或清除筛选后查看全部课程。"
                  : "新的课程系列会陆续发布在这里。"
              }
              title={hasFilters ? "没有找到匹配内容" : "课程正在准备中"}
            />
          ) : (
            <div className="grid gap-7 lg:grid-cols-2">
              {series.map((item, index) => (
                <MdldmSeriesCard
                  accessLevel={item.accessLevel}
                  category={item.category}
                  courseCount={item.courseCount}
                  coverImageUrl={item.coverImageUrl}
                  description={item.description}
                  featured={index === 0 && !hasFilters}
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
