export const publishStatuses = ["draft", "published", "archived"] as const;
export type PublishStatus = (typeof publishStatuses)[number];

export const accessLevels = [
  "public",
  "registered",
  "member",
  "course",
  "series",
] as const;
export type AccessLevel = (typeof accessLevels)[number];

export const courseContentTypes = ["video", "article"] as const;
export type CourseContentType = (typeof courseContentTypes)[number];

export const courseContentLimits = {
  articleBody: 100_000,
} as const;

export type CoursePublicationBlocker =
  | "VIDEO_REQUIRED"
  | "ARTICLE_BODY_REQUIRED";

export function getCoursePublicationBlocker(input: {
  contentType: CourseContentType;
  hasReadyVideo: boolean;
  articleBody: string;
}): CoursePublicationBlocker | null {
  if (input.contentType === "article") {
    return input.articleBody.trim().length > 0 ? null : "ARTICLE_BODY_REQUIRED";
  }

  return input.hasReadyVideo ? null : "VIDEO_REQUIRED";
}

export interface CourseAccessPolicy {
  level: AccessLevel;
  courseId: string;
  seriesId?: string;
}

export * from "./discovery";
export * from "./queries";
