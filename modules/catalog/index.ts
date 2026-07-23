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

export interface CourseAccessPolicy {
  level: AccessLevel;
  courseId: string;
  seriesId?: string;
}
