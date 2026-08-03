import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import {
  courseContentLimits,
  getCoursePublicationBlocker,
} from "@/modules/catalog";
import { CourseModel } from "@/providers/database/mongodb/models/series";

describe("course content rules", () => {
  it("keeps existing lessons video-first and the schema strict", () => {
    const course = new CourseModel({
      seriesId: new Types.ObjectId(),
      title: "默认视频课",
      slug: "default-video",
      summary: "验证旧数据的安全默认值。",
      position: 0,
      status: "draft",
      accessLevel: "public",
    });

    expect(course.contentType).toBe("video");
    expect(course.articleBody).toBe("");
    expect(
      () =>
        new CourseModel({
          seriesId: new Types.ObjectId(),
          title: "错误课时",
          slug: "invalid-course",
          summary: "不能持久化未知字段。",
          position: 0,
          status: "draft",
          accessLevel: "public",
          privateDraft: "must-not-persist",
        }),
    ).toThrow(/strict mode|not in schema/i);
  });

  it("requires a ready video only for video lessons", () => {
    expect(
      getCoursePublicationBlocker({
        contentType: "video",
        hasReadyVideo: false,
        articleBody: "",
      }),
    ).toBe("VIDEO_REQUIRED");
    expect(
      getCoursePublicationBlocker({
        contentType: "video",
        hasReadyVideo: true,
        articleBody: "",
      }),
    ).toBeNull();
  });

  it("requires non-blank article text and caps persisted content", () => {
    expect(
      getCoursePublicationBlocker({
        contentType: "article",
        hasReadyVideo: false,
        articleBody: "   \n",
      }),
    ).toBe("ARTICLE_BODY_REQUIRED");
    expect(
      getCoursePublicationBlocker({
        contentType: "article",
        hasReadyVideo: false,
        articleBody: "第一节：先说明为什么。",
      }),
    ).toBeNull();

    const oversized = new CourseModel({
      seriesId: new Types.ObjectId(),
      contentType: "article",
      articleBody: "文".repeat(courseContentLimits.articleBody + 1),
      title: "超长图文课",
      slug: "oversized-article",
      summary: "验证正文上限。",
      position: 0,
      status: "draft",
      accessLevel: "public",
    });
    expect(oversized.validateSync()?.errors.articleBody).toBeDefined();
  });
});
