import type {
  CatalogQueryRepository,
} from "@/modules/catalog";
import { createMongoCatalogQueryRepository } from "@/providers/database/mongodb/repositories/catalog-query-repository";

export function createCatalogQueryService(repository: CatalogQueryRepository) {
  return {
    getHomeCatalog: () => repository.getHomeCatalog(),
    browsePublishedSeries: (filters: {
      query: string;
      category: string;
      tag: string;
    }) => repository.browsePublishedSeries(filters),
    findPublishedSeriesBySlug: (slug: string) => {
      if (
        slug.length === 0 ||
        slug.length > 120 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)
      ) {
        return Promise.resolve(null);
      }
      return repository.findPublishedSeriesBySlug(slug);
    },
    listPublishedSeriesByTag: (tag: string) =>
      repository.listPublishedSeriesByTag(tag),
    listAdminCatalog: () => repository.listAdminCatalog(),
  };
}

const catalogQueries = createCatalogQueryService(
  createMongoCatalogQueryRepository(),
);

export const getHomeCatalog = catalogQueries.getHomeCatalog;
export const browsePublishedSeries = catalogQueries.browsePublishedSeries;
export const findPublishedSeriesBySlug =
  catalogQueries.findPublishedSeriesBySlug;
export const listPublishedSeriesByTag =
  catalogQueries.listPublishedSeriesByTag;
export const listAdminCatalog = catalogQueries.listAdminCatalog;
