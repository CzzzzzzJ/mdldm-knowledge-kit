import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import { parseByteRange } from "@/modules/media/range";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { CourseModel } from "@/providers/database/mongodb/models/series";
import { localStorageProvider } from "@/providers/storage/local";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  if (!isValidObjectId(assetId)) {
    return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
  }

  await connectMongo();
  const [asset, course] = await Promise.all([
    MediaAssetModel.findById(assetId),
    CourseModel.findOne({ videoAssetId: assetId, status: "published" }),
  ]);

  if (!asset || !course || asset.status !== "ready" || asset.kind !== "video") {
    return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
  }

  if (!(await canCurrentUserAccessCourse(course))) {
    return NextResponse.json({ error: "无权播放此课程" }, { status: 403 });
  }

  const absolutePath = localStorageProvider.resolve(asset.objectKey);
  const file = await stat(absolutePath).catch(() => null);
  if (!file) {
    return NextResponse.json({ error: "媒体文件不可用" }, { status: 503 });
  }

  const range = request.headers.get("range");
  if (!range) {
    const stream = createReadStream(absolutePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(file.size),
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const parsedRange = parseByteRange(range, file.size);
  if (!parsedRange) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${file.size}` },
    });
  }

  const { start, end } = parsedRange;

  const stream = createReadStream(absolutePath, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${file.size}`,
      "Content-Type": asset.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
