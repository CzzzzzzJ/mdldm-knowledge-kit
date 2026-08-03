import type { CourseAccessPolicy } from "@/modules/catalog";
import { getCurrentUser } from "@/providers/auth/session";
import { canAccessCourse } from "@/modules/entitlement";
import { createMongoLearningQueryRepository } from "@/providers/database/mongodb/repositories/learning-query-repository";

const learningRepository = createMongoLearningQueryRepository();

export async function canCurrentUserAccessCourse(
  policy: CourseAccessPolicy,
): Promise<boolean> {
  if (policy.level === "public") {
    return true;
  }

  const user = await getCurrentUser();
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const now = new Date();
  const entitlements = await learningRepository.listActiveEntitlements(
    user.id,
    now,
  );

  return canAccessCourse(
    policy,
    {
      authenticated: true,
      now,
      entitlements,
    },
  );
}
