import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseMaterialModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { CourseModel } from "@/providers/database/mongodb/models/series";
import { getStorageProvider } from "@/providers/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ materialId: string }> },
) {
  const { materialId } = await context.params;
  if (!isValidObjectId(materialId)) {
    return NextResponse.json({ error: "资料不存在" }, { status: 404 });
  }

  await connectMongo();
  const material = await CourseMaterialModel.findById(materialId);
  if (!material) {
    return NextResponse.json({ error: "资料不存在" }, { status: 404 });
  }

  const [course, asset] = await Promise.all([
    CourseModel.findById(material.courseId),
    MediaAssetModel.findById(material.mediaAssetId),
  ]);

  if (!course || course.status !== "published" || !asset || asset.status !== "ready") {
    return NextResponse.json({ error: "资料不存在" }, { status: 404 });
  }

  if (!(await canCurrentUserAccessCourse(course, material.accessLevel))) {
    return NextResponse.json({ error: "无权下载此资料" }, { status: 403 });
  }

  const storage = getStorageProvider();
  if (storage.name !== asset.provider) {
    return NextResponse.json(
      { error: "资料存储配置不一致" },
      { status: 503 },
    );
  }

  const signedUrl = await storage.createReadUrl(asset.objectKey, {
    expiresInSeconds: 5 * 60,
    contentType: asset.mimeType,
    downloadName: asset.originalName,
  });
  if (signedUrl) {
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const absolutePath = storage.localPath(asset.objectKey);
  const file = absolutePath
    ? await stat(absolutePath).catch(() => null)
    : null;
  if (!file || !absolutePath) {
    return NextResponse.json({ error: "资料文件不可用" }, { status: 503 });
  }

  const stream = createReadStream(absolutePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
      "Content-Length": String(file.size),
      "Content-Type": asset.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
