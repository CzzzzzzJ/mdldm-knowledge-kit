import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { CourseModel } from "@/providers/database/mongodb/models/series";
import { getStorageProvider } from "@/providers/storage";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { courseId } = await context.params;
  if (!isValidObjectId(courseId)) {
    return NextResponse.json({ error: "课时不存在" }, { status: 404 });
  }

  await connectMongo();
  const course = await CourseModel.findById(courseId);
  if (!course) {
    return NextResponse.json({ error: "课时不存在" }, { status: 404 });
  }

  if (!course.videoAssetId) {
    return NextResponse.json(
      { error: "发布前必须上传并绑定视频" },
      { status: 400 },
    );
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
    return NextResponse.json(
      { error: "发布前媒体可用性校验失败" },
      { status: 400 },
    );
  }

  course.status = "published";
  course.publishedAt = new Date();
  await course.save();

  return NextResponse.json({
    course: {
      id: course._id.toString(),
      status: course.status,
      publishedAt: course.publishedAt,
    },
  });
}
