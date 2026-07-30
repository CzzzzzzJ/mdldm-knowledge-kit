import { describe, expect, it } from "vitest";

import {
  createLiteralSearchRegExp,
  decodeTaxonomyPathSegment,
  parseDiscoveryFilters,
  parseSeriesDiscoveryMetadata,
} from "@/modules/catalog";

describe("catalog discovery", () => {
  it("normalizes valid search filters", () => {
    const result = parseDiscoveryFilters({
      q: "  ＡＩ   写作 ",
      category: " 内容   创作 ",
      tag: "Vibe Coding",
    });

    expect(result).toEqual({
      filters: {
        query: "AI 写作",
        category: "内容 创作",
        tag: "Vibe Coding",
      },
      invalidFields: [],
    });
  });

  it("ignores oversized, controlled or duplicated query parameters", () => {
    const result = parseDiscoveryFilters({
      q: "a".repeat(81),
      category: ["AI", "运营"],
      tag: "内容\u0000创作",
    });

    expect(result.filters).toEqual({
      query: "",
      category: "",
      tag: "",
    });
    expect(result.invalidFields).toEqual(["query", "category", "tag"]);
  });

  it("creates a literal regular expression without regex injection", () => {
    const pattern = createLiteralSearchRegExp(".*", { exact: true });

    expect(pattern).not.toBeNull();
    expect(pattern?.test(".*")).toBe(true);
    expect(pattern?.test("任意内容")).toBe(false);
  });

  it("decodes taxonomy route segments and rejects malformed escapes", () => {
    expect(decodeTaxonomyPathSegment("Vibe%20Coding")).toBe("Vibe Coding");
    expect(decodeTaxonomyPathSegment("%E7%9F%A5%E8%AF%86%E4%BA%A7%E5%93%81")).toBe(
      "知识产品",
    );
    expect(decodeTaxonomyPathSegment("%E0%A4%A")).toBeNull();
  });

  it("validates and normalizes series discovery metadata", () => {
    expect(
      parseSeriesDiscoveryMetadata({
        category: "  ＡＩ   创作 ",
        tags: [" Vibe Coding ", "AI", "ai", "知识产品"],
        coverImageUrl: " /demo/approved-course-cover.webp ",
      }),
    ).toEqual({
      category: "AI 创作",
      tags: ["Vibe Coding", "AI", "知识产品"],
      coverImageUrl: "/demo/approved-course-cover.webp",
    });
  });

  it("rejects unsafe covers and excessive tags", () => {
    expect(() =>
      parseSeriesDiscoveryMetadata({
        coverImageUrl: "javascript:alert(1)",
      }),
    ).toThrow();
    expect(() =>
      parseSeriesDiscoveryMetadata({
        tags: Array.from({ length: 11 }, (_, index) => `标签${index}`),
      }),
    ).toThrow();
  });
});
