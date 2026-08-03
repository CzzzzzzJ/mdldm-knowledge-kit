import { isValidObjectId } from "mongoose";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseMaterialModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { CourseModel } from "@/providers/database/mongodb/models/series";

interface DeliverableAsset {
  provider: "local" | "oss";
  objectKey: string;
  mimeType: string;
  originalName: string;
}

type DeliveryResult =
  | { ok: true; asset: DeliverableAsset }
  | { ok: false; reason: "not_found" | "forbidden" };

export async function getVideoAssetForViewer(
  assetId: string,
): Promise<DeliveryResult> {
  if (!isValidObjectId(assetId)) return { ok: false, reason: "not_found" };
  await connectMongo();
  const [asset, courses] = await Promise.all([
    MediaAssetModel.findById(assetId).lean(),
    CourseModel.find({ videoAssetId: assetId, status: "published" }).lean(),
  ]);
  if (
    !asset ||
    courses.length === 0 ||
    asset.status !== "ready" ||
    asset.kind !== "video"
  ) {
    return { ok: false, reason: "not_found" };
  }
  const decisions = await Promise.all(
    courses.map((course) =>
      canCurrentUserAccessCourse({
        level: course.accessLevel,
        courseId: course._id.toString(),
        seriesId: course.seriesId.toString(),
      }),
    ),
  );
  if (!decisions.some(Boolean)) return { ok: false, reason: "forbidden" };
  return {
    ok: true,
    asset: {
      provider: asset.provider,
      objectKey: asset.objectKey,
      mimeType: asset.mimeType,
      originalName: asset.originalName,
    },
  };
}

export async function getMaterialAssetForViewer(
  materialId: string,
): Promise<DeliveryResult> {
  if (!isValidObjectId(materialId)) return { ok: false, reason: "not_found" };
  await connectMongo();
  const material = await CourseMaterialModel.findById(materialId).lean();
  if (!material) return { ok: false, reason: "not_found" };
  const [course, asset] = await Promise.all([
    CourseModel.findById(material.courseId).lean(),
    MediaAssetModel.findById(material.mediaAssetId).lean(),
  ]);
  if (!course || course.status !== "published" || !asset || asset.status !== "ready") {
    return { ok: false, reason: "not_found" };
  }
  const allowed = await canCurrentUserAccessCourse({
    level: material.accessLevel,
    courseId: course._id.toString(),
    seriesId: course.seriesId.toString(),
  });
  if (!allowed) return { ok: false, reason: "forbidden" };
  return {
    ok: true,
    asset: {
      provider: asset.provider,
      objectKey: asset.objectKey,
      mimeType: asset.mimeType,
      originalName: asset.originalName,
    },
  };
}
