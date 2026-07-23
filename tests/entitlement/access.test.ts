import { describe, expect, it } from "vitest";

import {
  canAccessCourse,
  type AccessContext,
  type Entitlement,
} from "@/modules/entitlement";

const now = new Date("2026-07-24T00:00:00.000Z");

function context(
  entitlements: readonly Entitlement[] = [],
): AccessContext {
  return {
    authenticated: true,
    now,
    entitlements,
  };
}

describe("course entitlement access", () => {
  it("allows public content without authentication", () => {
    expect(
      canAccessCourse(
        { level: "public", courseId: "course-a" },
        { authenticated: false, now, entitlements: [] },
      ),
    ).toBe(true);
  });

  it("allows a member to access member content", () => {
    expect(
      canAccessCourse(
        { level: "member", courseId: "course-a" },
        context([
          {
            type: "membership",
            targetId: null,
            startsAt: new Date("2026-01-01T00:00:00.000Z"),
            endsAt: new Date("2027-01-01T00:00:00.000Z"),
            revokedAt: null,
          },
        ]),
      ),
    ).toBe(true);
  });

  it("allows only the purchased course", () => {
    const purchasedCourse: Entitlement = {
      type: "course",
      targetId: "course-a",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: null,
      revokedAt: null,
    };

    expect(
      canAccessCourse(
        { level: "course", courseId: "course-a" },
        context([purchasedCourse]),
      ),
    ).toBe(true);

    expect(
      canAccessCourse(
        { level: "course", courseId: "course-b" },
        context([purchasedCourse]),
      ),
    ).toBe(false);
  });

  it("rejects expired or revoked access", () => {
    const expiredMembership: Entitlement = {
      type: "membership",
      targetId: null,
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-01-01T00:00:00.000Z"),
      revokedAt: null,
    };

    expect(
      canAccessCourse(
        { level: "member", courseId: "course-a" },
        context([expiredMembership]),
      ),
    ).toBe(false);
  });
});
