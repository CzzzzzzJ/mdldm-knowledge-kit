import { z } from "zod";

export const discoveryLimits = {
  query: 80,
  taxonomy: 40,
  tagsPerSeries: 10,
  coverImageUrl: 2_048,
} as const;

export interface DiscoveryFilters {
  query: string;
  category: string;
  tag: string;
}

export interface DiscoveryFilterResult {
  filters: DiscoveryFilters;
  invalidFields: Array<keyof DiscoveryFilters>;
}

export interface SeriesDiscoveryMetadata {
  category: string;
  tags: string[];
  coverImageUrl: string;
}

type SearchParamValue = string | string[] | undefined;
type SearchParamRecord = Record<string, SearchParamValue>;

const controlCharacters = /[\u0000-\u001f\u007f]/u;

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function optionalSearchParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : undefined;
  }

  return value;
}

function parseOptionalText(
  value: SearchParamValue,
  maxLength: number,
): { value: string; valid: boolean } {
  const candidate = optionalSearchParam(value);
  if (candidate === undefined || candidate === "") {
    return { value: "", valid: candidate !== undefined || value === undefined };
  }

  const normalized = normalizeText(candidate);
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    controlCharacters.test(normalized)
  ) {
    return { value: "", valid: false };
  }

  return { value: normalized, valid: true };
}

export function parseDiscoveryFilters(input: unknown): DiscoveryFilterResult {
  const params =
    input && typeof input === "object"
      ? (input as SearchParamRecord)
      : ({} as SearchParamRecord);
  const query = parseOptionalText(params.q, discoveryLimits.query);
  const category = parseOptionalText(
    params.category,
    discoveryLimits.taxonomy,
  );
  const tag = parseOptionalText(params.tag, discoveryLimits.taxonomy);
  const invalidFields: Array<keyof DiscoveryFilters> = [];

  if (!query.valid) {
    invalidFields.push("query");
  }
  if (!category.valid) {
    invalidFields.push("category");
  }
  if (!tag.valid) {
    invalidFields.push("tag");
  }

  return {
    filters: {
      query: query.value,
      category: category.value,
      tag: tag.value,
    },
    invalidFields,
  };
}

export function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function createLiteralSearchRegExp(
  value: string,
  options: { exact?: boolean } = {},
): RegExp | null {
  const parsed = parseOptionalText(value, discoveryLimits.query);
  if (!parsed.valid || !parsed.value) {
    return null;
  }

  const literal = escapeRegExpLiteral(parsed.value);
  return new RegExp(options.exact ? `^${literal}$` : literal, "iu");
}

export function normalizeCategory(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const parsed = parseOptionalText(value, discoveryLimits.taxonomy);
  return parsed.valid ? parsed.value : "";
}

export function decodeTaxonomyPathSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    const normalized = normalizeCategory(decoded);
    return normalized || null;
  } catch {
    return null;
  }
}

export function normalizeSeriesTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const parsed = parseOptionalText(item, discoveryLimits.taxonomy);
    if (!parsed.valid || !parsed.value) {
      continue;
    }

    const comparable = parsed.value.toLocaleLowerCase();
    if (seen.has(comparable)) {
      continue;
    }

    seen.add(comparable);
    tags.push(parsed.value);
    if (tags.length === discoveryLimits.tagsPerSeries) {
      break;
    }
  }

  return tags;
}

function isSafeCoverImageUrl(value: string): boolean {
  if (!value) {
    return true;
  }

  if (value.startsWith("/")) {
    return !value.startsWith("//");
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeCoverImageUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  if (
    normalized.length > discoveryLimits.coverImageUrl ||
    controlCharacters.test(normalized) ||
    !isSafeCoverImageUrl(normalized)
  ) {
    return "";
  }

  return normalized;
}

const taxonomyInputSchema = z
  .string()
  .transform(normalizeText)
  .refine(
    (value) =>
      value.length <= discoveryLimits.taxonomy &&
      !controlCharacters.test(value),
    `分类或标签不能超过 ${discoveryLimits.taxonomy} 个字符`,
  );

const tagInputSchema = taxonomyInputSchema.refine(
  (value) => value.length > 0,
  "标签不能为空",
);

const coverImageUrlInputSchema = z
  .string()
  .trim()
  .max(discoveryLimits.coverImageUrl)
  .refine(isSafeCoverImageUrl, "封面地址必须是站内路径或 HTTP(S) URL");

export const seriesDiscoveryMetadataSchema = z
  .object({
    category: taxonomyInputSchema.optional().default(""),
    tags: z
      .array(tagInputSchema)
      .max(discoveryLimits.tagsPerSeries)
      .optional()
      .default([]),
    coverImageUrl: coverImageUrlInputSchema.optional().default(""),
  })
  .strict()
  .transform(
    (input): SeriesDiscoveryMetadata => ({
      category: normalizeCategory(input.category),
      tags: normalizeSeriesTags(input.tags),
      coverImageUrl: normalizeCoverImageUrl(input.coverImageUrl),
    }),
  );

export function parseSeriesDiscoveryMetadata(
  input: unknown,
): SeriesDiscoveryMetadata {
  return seriesDiscoveryMetadataSchema.parse(input);
}
