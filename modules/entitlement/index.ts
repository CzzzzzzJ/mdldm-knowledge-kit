import type { CourseAccessPolicy } from "@/modules/catalog";

export const entitlementTypes = [
  "membership",
  "course",
  "series",
] as const;
export type EntitlementType = (typeof entitlementTypes)[number];

export interface Entitlement {
  type: EntitlementType;
  targetId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
}

export interface AccessContext {
  authenticated: boolean;
  now: Date;
  entitlements: readonly Entitlement[];
}

function isActive(entitlement: Entitlement, now: Date): boolean {
  return (
    entitlement.revokedAt === null &&
    entitlement.startsAt <= now &&
    (entitlement.endsAt === null || entitlement.endsAt > now)
  );
}

export function canAccessCourse(
  policy: CourseAccessPolicy,
  context: AccessContext,
): boolean {
  if (policy.level === "public") {
    return true;
  }

  if (!context.authenticated) {
    return false;
  }

  if (policy.level === "registered") {
    return true;
  }

  return context.entitlements.some((entitlement) => {
    if (!isActive(entitlement, context.now)) {
      return false;
    }

    if (entitlement.type === "membership") {
      return true;
    }

    if (policy.level === "course" && entitlement.type === "course") {
      return entitlement.targetId === policy.courseId;
    }

    if (policy.level === "series" && entitlement.type === "series") {
      return entitlement.targetId === policy.seriesId;
    }

    return false;
  });
}
