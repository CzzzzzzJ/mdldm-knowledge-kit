import type { FilterQuery } from "mongoose";

import {
  createLiteralSearchRegExp,
  normalizeCategory,
  type CatalogCourseDto,
  type CatalogQueryRepository,
  type CatalogSeriesDto,
} from "@/modules/catalog";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  type CourseRecord,
  SeriesModel,
  type SeriesRecord,
} from "@/providers/database/mongodb/models/series";

type SeriesDocument = SeriesRecord & { _id: { toString(): string } };
type CourseDocument = CourseRecord & {
  _id: { toString(): string };
  seriesId: { toString(): string };
  videoAssetId: { toString(): string } | null;
};

function toSeriesDto(series: SeriesDocument): CatalogSeriesDto {
  return {
    id: series._id.toString(),
    title: series.title,
    slug: series.slug,
    description: series.description,
    category: series.category ?? "",
    tags: [...(series.tags ?? [])],
    coverImageUrl: series.coverImageUrl ?? "",
    status: series.status,
    accessLevel: series.accessLevel,
  };
}

function toCourseDto(course: CourseDocument): CatalogCourseDto {
  return {
    id: course._id.toString(),
    seriesId: course.seriesId.toString(),
    videoAssetId: course.videoAssetId?.toString() ?? null,
    contentType: course.contentType ?? "video",
    title: course.title,
    slug: course.slug,
    summary: course.summary,
    position: course.position,
    status: course.status,
    accessLevel: course.accessLevel,
    publishedAt: course.publishedAt?.toISOString() ?? null,
  };
}

function normalizeFacetValues(values: unknown[]): string[] {
  const normalized = values
    .map((value) => normalizeCategory(value))
    .filter(Boolean);

  return Array.from(new Set(normalized)).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

async function countPublishedCoursesBySeries(seriesIds: unknown[]) {
  if (seriesIds.length === 0) {
    return new Map<string, number>();
  }

  const counts = await CourseModel.aggregate<{ _id: unknown; count: number }>([
    { $match: { seriesId: { $in: seriesIds }, status: "published" } },
    { $group: { _id: "$seriesId", count: { $sum: 1 } } },
  ]);
  return new Map(counts.map((item) => [String(item._id), item.count]));
}

export function createMongoCatalogQueryRepository(): CatalogQueryRepository {
  return {
    async getHomeCatalog() {
      await connectMongo();
      const [featuredSeries, latestCourses] = await Promise.all([
        SeriesModel.find({ status: "published" })
          .sort({ updatedAt: -1 })
          .limit(3)
          .lean(),
        CourseModel.find({ status: "published" })
          .sort({ publishedAt: -1, updatedAt: -1 })
          .limit(4)
          .lean(),
      ]);
      const latestSeries = await SeriesModel.find({
        _id: { $in: latestCourses.map((course) => course.seriesId) },
        status: "published",
      }).lean();
      const titleBySeries = new Map(
        latestSeries.map((series) => [series._id.toString(), series.title]),
      );

      return {
        featuredSeries: featuredSeries.map((series) =>
          toSeriesDto(series as SeriesDocument),
        ),
        latestCourses: latestCourses.map((course) => ({
          ...toCourseDto(course as CourseDocument),
          seriesTitle: titleBySeries.get(course.seriesId.toString()) ?? "课程",
        })),
      };
    },

    async browsePublishedSeries(filters) {
      await connectMongo();
      const seriesFilter: FilterQuery<SeriesRecord> = { status: "published" };
      const constraints: Array<FilterQuery<SeriesRecord>> = [];
      const categoryPattern = createLiteralSearchRegExp(filters.category, {
        exact: true,
      });
      const tagPattern = createLiteralSearchRegExp(filters.tag, { exact: true });
      const queryPattern = createLiteralSearchRegExp(filters.query);

      if (categoryPattern) constraints.push({ category: categoryPattern });
      if (tagPattern) constraints.push({ tags: tagPattern });
      if (queryPattern) {
        const matchingSeriesIds = await CourseModel.distinct("seriesId", {
          status: "published",
          $or: [{ title: queryPattern }, { summary: queryPattern }],
        });
        constraints.push({
          $or: [
            { title: queryPattern },
            { description: queryPattern },
            { category: queryPattern },
            { tags: queryPattern },
            { _id: { $in: matchingSeriesIds } },
          ],
        });
      }
      if (constraints.length > 0) seriesFilter.$and = constraints;

      const [series, categories, tags] = await Promise.all([
        SeriesModel.find(seriesFilter).sort({ createdAt: -1 }).lean(),
        SeriesModel.distinct("category", { status: "published" }),
        SeriesModel.distinct("tags", { status: "published" }),
      ]);
      const counts = await countPublishedCoursesBySeries(
        series.map((item) => item._id),
      );

      return {
        series: series.map((item) => ({
          ...toSeriesDto(item as SeriesDocument),
          courseCount: counts.get(item._id.toString()) ?? 0,
        })),
        categories: normalizeFacetValues(categories),
        tags: normalizeFacetValues(tags).slice(0, 24),
      };
    },

    async findPublishedSeriesBySlug(slug) {
      await connectMongo();
      const series = await SeriesModel.findOne({
        slug,
        status: "published",
      }).lean();
      if (!series) return null;

      const courses = await CourseModel.find({
        seriesId: series._id,
        status: "published",
      })
        .sort({ position: 1 })
        .lean();

      return {
        series: toSeriesDto(series as SeriesDocument),
        courses: courses.map((course) => toCourseDto(course as CourseDocument)),
      };
    },

    async listPublishedSeriesByTag(tag) {
      await connectMongo();
      const pattern = createLiteralSearchRegExp(tag, { exact: true });
      if (!pattern) return [];

      const series = await SeriesModel.find({
        status: "published",
        tags: pattern,
      })
        .sort({ createdAt: -1 })
        .lean();
      const counts = await countPublishedCoursesBySeries(
        series.map((item) => item._id),
      );

      return series.map((item) => ({
        ...toSeriesDto(item as SeriesDocument),
        courseCount: counts.get(item._id.toString()) ?? 0,
      }));
    },

    async listAdminCatalog() {
      await connectMongo();
      const [series, courses] = await Promise.all([
        SeriesModel.find().sort({ createdAt: -1 }).lean(),
        CourseModel.find().sort({ createdAt: -1 }).lean(),
      ]);
      return {
        series: series.map((item) => toSeriesDto(item as SeriesDocument)),
        courses: courses.map((item) => ({
          ...toCourseDto(item as CourseDocument),
          hasArticleBody: Boolean(item.articleBody?.trim()),
        })),
      };
    },
  };
}
