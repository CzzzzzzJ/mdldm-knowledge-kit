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

  it("requires authentication for registered content", () => {
    expect(
      canAccessCourse(
        { level: "registered", courseId: "course-a" },
        { authenticated: false, now, entitlements: [] },
      ),
    ).toBe(false);
    expect(
      canAccessCourse(
        { level: "registered", courseId: "course-a" },
        context(),
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

  it("allows a matching series entitlement and rejects another series", () => {
    const seriesEntitlement: Entitlement = {
      type: "series",
      targetId: "series-a",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: null,
      revokedAt: null,
    };

    expect(
      canAccessCourse(
        {
          level: "series",
          courseId: "course-a",
          seriesId: "series-a",
        },
        context([seriesEntitlement]),
      ),
    ).toBe(true);
    expect(
      canAccessCourse(
        {
          level: "series",
          courseId: "course-b",
          seriesId: "series-b",
        },
        context([seriesEntitlement]),
      ),
    ).toBe(false);
  });

  it("allows active membership across member, course and series levels", () => {
    const membership: Entitlement = {
      type: "membership",
      targetId: null,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2027-01-01T00:00:00.000Z"),
      revokedAt: null,
    };

    for (const level of ["member", "course", "series"] as const) {
      expect(
        canAccessCourse(
          {
            level,
            courseId: "course-a",
            seriesId: "series-a",
          },
          context([membership]),
        ),
      ).toBe(true);
    }
  });

  it("rejects future and revoked entitlements", () => {
    const future: Entitlement = {
      type: "membership",
      targetId: null,
      startsAt: new Date("2026-08-01T00:00:00.000Z"),
      endsAt: null,
      revokedAt: null,
    };
    const revoked: Entitlement = {
      type: "course",
      targetId: "course-a",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: null,
      revokedAt: new Date("2026-07-01T00:00:00.000Z"),
    };

    expect(
      canAccessCourse(
        { level: "member", courseId: "course-a" },
        context([future]),
      ),
    ).toBe(false);
    expect(
      canAccessCourse(
        { level: "course", courseId: "course-a" },
        context([revoked]),
      ),
    ).toBe(false);
  });
});
