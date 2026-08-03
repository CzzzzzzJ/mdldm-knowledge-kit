import type { AccessLevel, PublishStatus } from "@/modules/catalog";

export interface CatalogSeriesDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  coverImageUrl: string;
  status: PublishStatus;
  accessLevel: AccessLevel;
}

export interface CatalogCourseDto {
  id: string;
  seriesId: string;
  videoAssetId: string | null;
  title: string;
  slug: string;
  summary: string;
  position: number;
  status: PublishStatus;
  accessLevel: AccessLevel;
  publishedAt: string | null;
}

export interface CatalogSeriesCardDto extends CatalogSeriesDto {
  courseCount: number;
}

export interface HomeCatalogDto {
  featuredSeries: CatalogSeriesDto[];
  latestCourses: Array<CatalogCourseDto & { seriesTitle: string }>;
}

export interface CatalogBrowseDto {
  series: CatalogSeriesCardDto[];
  categories: string[];
  tags: string[];
}

export interface CatalogSeriesDetailDto {
  series: CatalogSeriesDto;
  courses: CatalogCourseDto[];
}

export interface AdminCatalogDto {
  series: CatalogSeriesDto[];
  courses: CatalogCourseDto[];
}

export interface CatalogQueryRepository {
  getHomeCatalog(): Promise<HomeCatalogDto>;
  browsePublishedSeries(filters: {
    query: string;
    category: string;
    tag: string;
  }): Promise<CatalogBrowseDto>;
  findPublishedSeriesBySlug(
    slug: string,
  ): Promise<CatalogSeriesDetailDto | null>;
  listPublishedSeriesByTag(tag: string): Promise<CatalogSeriesCardDto[]>;
  listAdminCatalog(): Promise<AdminCatalogDto>;
}
