import type { UserAccount } from "@/modules/identity";
import { canAccessCourse } from "@/modules/entitlement";
import type { LearningQueryRepository } from "@/modules/learning";
import { createMongoLearningQueryRepository } from "@/providers/database/mongodb/repositories/learning-query-repository";

export function createLearningQueryService(repository: LearningQueryRepository) {
  return {
    getLearningCenter: (userId: string, now = new Date()) =>
      repository.getLearningCenter(userId, now),

    async getLessonForViewer(input: {
      courseId: string;
      viewer: UserAccount | null;
      now?: Date;
    }) {
      const lesson = await repository.findPublishedLesson(input.courseId);
      if (!lesson) return null;

      const now = input.now ?? new Date();
      let allowed = lesson.course.accessLevel === "public";
      if (input.viewer?.role === "admin") {
        allowed = true;
      } else if (input.viewer) {
        const entitlements = await repository.listActiveEntitlements(
          input.viewer.id,
          now,
        );
        allowed = canAccessCourse(
          {
            level: lesson.course.accessLevel,
            courseId: lesson.course.id,
            seriesId: lesson.course.seriesId,
          },
          { authenticated: true, now, entitlements },
        );
      }

      return {
        ...lesson,
        allowed,
        materials: allowed ? lesson.materials : [],
        videoAsset: allowed ? lesson.videoAsset : null,
      };
    },
  };
}

const learningQueries = createLearningQueryService(
  createMongoLearningQueryRepository(),
);

export const getLearningCenter = learningQueries.getLearningCenter;
export const getLessonForViewer = learningQueries.getLessonForViewer;
