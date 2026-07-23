import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { getServerEnv } from "@/config/env";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { localStorageProvider } from "@/providers/storage/local";

const mediaKind = z.enum(["video", "document", "image"]);

const allowedMimeTypes = {
  video: new Set(["video/mp4"]),
  document: new Set([
    "application/pdf",
    "application/zip",
    "text/plain",
    "text/markdown",
  ]),
  image: new Set(["image/jpeg", "image/png", "image/webp"]),
} as const;

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const form = await request.formData();
  const file = form.get("file");
  const parsedKind = mediaKind.safeParse(form.get("kind"));

  if (!(file instanceof File) || !parsedKind.success) {
    return NextResponse.json({ error: "媒体上传参数错误" }, { status: 400 });
  }

  const env = getServerEnv();
  if (file.size === 0 || file.size > env.MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "媒体文件大小不符合限制" }, { status: 413 });
  }

  if (!allowedMimeTypes[parsedKind.data].has(file.type as never)) {
    return NextResponse.json({ error: "不支持的媒体类型" }, { status: 415 });
  }

  const extension = path.extname(file.name).toLowerCase().slice(0, 12);
  const objectKey = `${parsedKind.data}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  const data = new Uint8Array(await file.arrayBuffer());
  const stored = await localStorageProvider.put(objectKey, data);

  try {
    await connectMongo();
    const asset = await MediaAssetModel.create({
      ownerId: authorization.user.id,
      kind: parsedKind.data,
      status: "ready",
      provider: "local",
      objectKey,
      originalName: path.basename(file.name).slice(0, 255),
      mimeType: file.type,
      size: stored.size,
      checksum: stored.checksum,
    });

    return NextResponse.json(
      {
        asset: {
          id: asset._id.toString(),
          kind: asset.kind,
          originalName: asset.originalName,
          size: asset.size,
          status: asset.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await localStorageProvider.delete(objectKey);
    throw error;
  }
}
