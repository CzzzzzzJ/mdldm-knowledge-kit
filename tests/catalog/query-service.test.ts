import { describe, expect, it, vi } from "vitest";

import { createCatalogQueryService } from "@/app/lib/catalog-query-service";
import type { CatalogQueryRepository } from "@/modules/catalog";

function createRepository(): CatalogQueryRepository {
  return {
    getHomeCatalog: vi.fn(),
    browsePublishedSeries: vi.fn(),
    findPublishedSeriesBySlug: vi.fn(),
    listPublishedSeriesByTag: vi.fn(),
    listAdminCatalog: vi.fn(),
  };
}

describe("catalog query service", () => {
  it("rejects malformed slugs before reaching MongoDB", async () => {
    const repository = createRepository();
    const service = createCatalogQueryService(repository);

    await expect(
      service.findPublishedSeriesBySlug("../private"),
    ).resolves.toBeNull();
    expect(repository.findPublishedSeriesBySlug).not.toHaveBeenCalled();
  });

  it("delegates normalized discovery filters through the repository port", async () => {
    const repository = createRepository();
    vi.mocked(repository.browsePublishedSeries).mockResolvedValue({
      series: [],
      categories: ["AI 创作"],
      tags: ["Codex"],
    });
    const service = createCatalogQueryService(repository);
    const filters = { query: "Codex", category: "AI 创作", tag: "入门" };

    await expect(service.browsePublishedSeries(filters)).resolves.toEqual({
      series: [],
      categories: ["AI 创作"],
      tags: ["Codex"],
    });
    expect(repository.browsePublishedSeries).toHaveBeenCalledWith(filters);
  });
});
