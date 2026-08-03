import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectMongo: vi.fn(),
  findCourse: vi.fn(),
  findMedia: vi.fn(),
  storageExists: vi.fn(),
}));

vi.mock("@/providers/database/mongodb/connection", () => ({
  connectMongo: mocks.connectMongo,
}));

vi.mock("@/providers/database/mongodb/models/series", () => ({
  CourseModel: {
    findById: mocks.findCourse,
  },
  SeriesModel: {},
}));

vi.mock("@/providers/database/mongodb/models/media", () => ({
  MediaAssetModel: {
    findOne: mocks.findMedia,
  },
}));

vi.mock("@/providers/database/mongodb/models/learning", () => ({
  CourseMaterialModel: {},
}));

vi.mock("@/providers/storage", () => ({
  getStorageProvider: () => ({
    name: "local",
    exists: mocks.storageExists,
  }),
}));

import {
  CatalogAdminError,
  publishCourse,
} from "@/app/lib/catalog-admin-service";

const courseId = "66aa11bb22cc33dd44ee5501";

function course(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => courseId },
    contentType: "article",
    articleBody: "一篇完整的虚构教程。",
    videoAssetId: null,
    status: "draft",
    publishedAt: null as Date | null,
    save: vi.fn(),
    ...overrides,
  };
}

describe("catalog publication service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a complete article without touching a storage provider", async () => {
    const record = course();
    mocks.findCourse.mockResolvedValue(record);

    const result = await publishCourse(courseId);

    expect(result.status).toBe("published");
    expect(record.status).toBe("published");
    expect(record.publishedAt).toBeInstanceOf(Date);
    expect(record.save).toHaveBeenCalledOnce();
    expect(mocks.findMedia).not.toHaveBeenCalled();
    expect(mocks.storageExists).not.toHaveBeenCalled();
  });

  it("blocks empty article text with a stable application error", async () => {
    mocks.findCourse.mockResolvedValue(course({ articleBody: "  \n" }));

    await expect(publishCourse(courseId)).rejects.toMatchObject({
      name: "CatalogAdminError",
      code: "CONTENT_NOT_READY",
    } satisfies Partial<CatalogAdminError>);
  });

  it("keeps video publication dependent on a ready stored MediaAsset", async () => {
    const record = course({
      contentType: "video",
      articleBody: "",
      videoAssetId: "66aa11bb22cc33dd44ee5502",
    });
    mocks.findCourse.mockResolvedValue(record);
    mocks.findMedia.mockResolvedValue({
      provider: "local",
      objectKey: "courses/video.mp4",
    });
    mocks.storageExists.mockResolvedValue(true);

    await expect(publishCourse(courseId)).resolves.toMatchObject({
      status: "published",
    });
    expect(mocks.storageExists).toHaveBeenCalledWith("courses/video.mp4");
  });
});
