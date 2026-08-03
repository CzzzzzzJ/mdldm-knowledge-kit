import { isValidObjectId } from "mongoose";

import {
  getCoursePublicationBlocker,
  type AccessLevel,
  type CourseContentType,
  type SeriesDiscoveryMetadata,
} from "@/modules/catalog";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseMaterialModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";
import { getStorageProvider } from "@/providers/storage";

export class CatalogAdminError extends Error {
  constructor(
    readonly code:
      | "SERIES_NOT_FOUND"
      | "SERIES_SLUG_EXISTS"
      | "COURSE_NOT_FOUND"
      | "COURSE_SLUG_EXISTS"
      | "MEDIA_NOT_READY"
      | "CONTENT_NOT_READY"
      | "MATERIAL_TARGET_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "CatalogAdminError";
  }
}

export async function createSeries(input: {
  title: string;
  slug: string;
  description: string;
  accessLevel: AccessLevel;
  metadata: SeriesDiscoveryMetadata;
}) {
  await connectMongo();
  if (await SeriesModel.exists({ slug: input.slug })) {
    throw new CatalogAdminError("SERIES_SLUG_EXISTS", "系列 slug 已存在");
  }
  const series = await SeriesModel.create({
    title: input.title,
    slug: input.slug,
    description: input.description,
    accessLevel: input.accessLevel,
    ...input.metadata,
    status: "draft",
  });
  return {
    id: series._id.toString(),
    title: series.title,
    status: series.status,
  };
}

export async function createCourse(input: {
  seriesId: string;
  title: string;
  slug: string;
  summary: string;
  contentType: CourseContentType;
  articleBody: string;
  accessLevel: AccessLevel;
  position: number;
}) {
  await connectMongo();
  if (!(await SeriesModel.exists({ _id: input.seriesId }))) {
    throw new CatalogAdminError("SERIES_NOT_FOUND", "系列不存在");
  }
  if (
    await CourseModel.exists({
      seriesId: input.seriesId,
      slug: input.slug,
    })
  ) {
    throw new CatalogAdminError(
      "COURSE_SLUG_EXISTS",
      "当前系列内 slug 已存在",
    );
  }
  const course = await CourseModel.create({
    ...input,
    videoAssetId: null,
    status: "draft",
    publishedAt: null,
  });
  return {
    id: course._id.toString(),
    title: course.title,
    status: course.status,
  };
}

export async function attachCourseVideo(input: {
  courseId: string;
  videoAssetId: string | null | undefined;
}) {
  if (!isValidObjectId(input.courseId)) {
    throw new CatalogAdminError("COURSE_NOT_FOUND", "课时不存在");
  }
  await connectMongo();
  if (
    input.videoAssetId &&
    !(await MediaAssetModel.exists({
      _id: input.videoAssetId,
      kind: "video",
      status: "ready",
    }))
  ) {
    throw new CatalogAdminError("MEDIA_NOT_READY", "视频资产不可用");
  }
  const course = await CourseModel.findByIdAndUpdate(
    input.courseId,
    {
      $set:
        input.videoAssetId === undefined
          ? {}
          : { videoAssetId: input.videoAssetId },
    },
    { new: true, runValidators: true },
  );
  if (!course) {
    throw new CatalogAdminError("COURSE_NOT_FOUND", "课时不存在");
  }
  return {
    id: course._id.toString(),
    videoAssetId: course.videoAssetId?.toString() ?? null,
    status: course.status,
  };
}

export async function publishCourse(courseId: string) {
  if (!isValidObjectId(courseId)) {
    throw new CatalogAdminError("COURSE_NOT_FOUND", "课时不存在");
  }
  await connectMongo();
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new CatalogAdminError("COURSE_NOT_FOUND", "课时不存在");
  }
  const contentType = course.contentType ?? "video";
  const initialBlocker = getCoursePublicationBlocker({
    contentType,
    hasReadyVideo: Boolean(course.videoAssetId),
    articleBody: course.articleBody ?? "",
  });
  if (initialBlocker === "ARTICLE_BODY_REQUIRED") {
    throw new CatalogAdminError(
      "CONTENT_NOT_READY",
      "发布图文课前必须填写正文",
    );
  }
  if (initialBlocker === "VIDEO_REQUIRED") {
    throw new CatalogAdminError(
      "MEDIA_NOT_READY",
      "发布前必须上传并绑定视频",
    );
  }

  if (contentType === "article") {
    course.status = "published";
    course.publishedAt = new Date();
    await course.save();
    return {
      id: course._id.toString(),
      status: course.status,
      publishedAt: course.publishedAt.toISOString(),
    };
  }

  const asset = await MediaAssetModel.findOne({
    _id: course.videoAssetId,
    kind: "video",
    status: "ready",
  });
  const storage = getStorageProvider();
  if (
    !asset ||
    asset.provider !== storage.name ||
    !(await storage.exists(asset.objectKey))
  ) {
    throw new CatalogAdminError(
      "MEDIA_NOT_READY",
      "发布前媒体可用性校验失败",
    );
  }
  course.status = "published";
  course.publishedAt = new Date();
  await course.save();
  return {
    id: course._id.toString(),
    status: course.status,
    publishedAt: course.publishedAt.toISOString(),
  };
}

export async function createCourseMaterial(input: {
  courseId: string;
  mediaAssetId: string;
  title: string;
  position: number;
  accessLevel: AccessLevel;
}) {
  await connectMongo();
  const [course, asset] = await Promise.all([
    CourseModel.exists({ _id: input.courseId }),
    MediaAssetModel.exists({
      _id: input.mediaAssetId,
      kind: "document",
      status: "ready",
    }),
  ]);
  if (!course || !asset) {
    throw new CatalogAdminError(
      "MATERIAL_TARGET_NOT_FOUND",
      "课程或资料资产不存在",
    );
  }
  const material = await CourseMaterialModel.create(input);
  return { id: material._id.toString(), title: material.title };
}
