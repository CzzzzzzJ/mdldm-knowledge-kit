import type { CourseRecord } from "@/providers/database/mongodb/models/series";
import type { AccessLevel } from "@/modules/catalog";
import { getCurrentUser } from "@/providers/auth/session";
import { canAccessCourse } from "@/modules/entitlement";
import { EntitlementModel } from "@/providers/database/mongodb/models/entitlement";

export async function canCurrentUserAccessCourse(
  course: CourseRecord & { _id: { toString(): string }; seriesId: { toString(): string } },
  accessLevel: AccessLevel = course.accessLevel,
): Promise<boolean> {
  if (accessLevel === "public") {
    return true;
  }

  const user = await getCurrentUser();
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const entitlements = await EntitlementModel.find({
    userId: user.id,
    startsAt: { $lte: new Date() },
    revokedAt: null,
    $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
  }).lean();

  return canAccessCourse(
    {
      level: accessLevel,
      courseId: course._id.toString(),
      seriesId: course.seriesId.toString(),
    },
    {
      authenticated: true,
      now: new Date(),
      entitlements: entitlements.map((entitlement) => ({
        type: entitlement.type,
        targetId: entitlement.targetId,
        startsAt: entitlement.startsAt,
        endsAt: entitlement.endsAt,
        revokedAt: entitlement.revokedAt,
      })),
    },
  );
}
