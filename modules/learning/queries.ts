import type { AccessLevel, CourseContentType } from "@/modules/catalog";
import type { EntitlementType } from "@/modules/entitlement";

export interface ActiveEntitlementDto {
  type: EntitlementType;
  targetId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
}

export interface LearningCenterDto {
  membershipEndsAt: string | null | undefined;
  otherEntitlementCount: number;
  recentCourses: Array<{
    progressId: string;
    courseId: string;
    title: string;
    accessLevel: AccessLevel;
    currentTimeSeconds: number;
    durationSeconds: number;
    completed: boolean;
  }>;
}

export interface LessonQueryRecord {
  course: {
    id: string;
    seriesId: string;
    title: string;
    summary: string;
    accessLevel: AccessLevel;
    contentType: CourseContentType;
    articleBody: string;
    videoAssetId: string | null;
  };
  series: { id: string; title: string; slug: string } | null;
  seriesCourses: Array<{ id: string; title: string }>;
  materials: Array<{ id: string; title: string }>;
  videoAsset: { id: string; status: string } | null;
}

export interface LearningLessonDto
  extends Omit<LessonQueryRecord, "course"> {
  course: Omit<LessonQueryRecord["course"], "articleBody"> & {
    articleBody: string | null;
  };
  allowed: boolean;
}

export interface LearningQueryRepository {
  getLearningCenter(userId: string, now: Date): Promise<LearningCenterDto>;
  findPublishedLesson(courseId: string): Promise<LessonQueryRecord | null>;
  listActiveEntitlements(
    userId: string,
    now: Date,
  ): Promise<ActiveEntitlementDto[]>;
}
