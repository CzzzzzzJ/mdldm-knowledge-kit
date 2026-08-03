import { describe, expect, it, vi } from "vitest";

import { createLearningQueryService } from "@/app/lib/learning-query-service";
import type { LearningQueryRepository } from "@/modules/learning";

function createRepository(): LearningQueryRepository {
  return {
    getLearningCenter: vi.fn(),
    findPublishedLesson: vi.fn().mockResolvedValue({
      course: {
        id: "course-1",
        seriesId: "series-1",
        title: "权益课程",
        summary: "测试课程",
        accessLevel: "course",
        videoAssetId: "asset-1",
      },
      series: { id: "series-1", title: "系列", slug: "series" },
      seriesCourses: [{ id: "course-1", title: "权益课程" }],
      materials: [{ id: "material-1", title: "讲义" }],
      videoAsset: { id: "asset-1", status: "ready" },
    }),
    listActiveEntitlements: vi.fn().mockResolvedValue([]),
  };
}

describe("learning query service", () => {
  it("redacts media and materials when the viewer has no entitlement", async () => {
    const repository = createRepository();
    const service = createLearningQueryService(repository);
    const lesson = await service.getLessonForViewer({
      courseId: "course-1",
      viewer: null,
      now: new Date("2026-08-03T00:00:00.000Z"),
    });

    expect(lesson).toMatchObject({
      allowed: false,
      materials: [],
      videoAsset: null,
    });
    expect(repository.listActiveEntitlements).not.toHaveBeenCalled();
  });

  it("uses Entitlement as the access fact and returns only safe DTO fields", async () => {
    const repository = createRepository();
    vi.mocked(repository.listActiveEntitlements).mockResolvedValue([
      {
        type: "course",
        targetId: "course-1",
        startsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: null,
        revokedAt: null,
      },
    ]);
    const service = createLearningQueryService(repository);
    const lesson = await service.getLessonForViewer({
      courseId: "course-1",
      viewer: {
        id: "user-1",
        name: "测试学员",
        email: "learner@example.com",
        role: "user",
        status: "active",
        emailVerified: true,
        requiresPasswordChange: false,
      },
      now: new Date("2026-08-03T00:00:00.000Z"),
    });

    expect(lesson).toMatchObject({
      allowed: true,
      materials: [{ id: "material-1", title: "讲义" }],
      videoAsset: { id: "asset-1", status: "ready" },
    });
    expect(JSON.stringify(lesson)).not.toContain("passwordHash");
    expect(JSON.stringify(lesson)).not.toContain("objectKey");
  });
});
