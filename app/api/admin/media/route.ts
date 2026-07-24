import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { reportOperationalFailure } from "@/app/lib/operations-service";
import { getServerEnv } from "@/config/env";
import {
  isAllowedMediaUpload,
  mediaKindSchema,
} from "@/modules/media/upload-policy";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { getStorageProvider } from "@/providers/storage";

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const form = await request.formData();
  const file = form.get("file");
  const parsedKind = mediaKindSchema.safeParse(form.get("kind"));

  if (!(file instanceof File) || !parsedKind.success) {
    return NextResponse.json({ error: "媒体上传参数错误" }, { status: 400 });
  }

  const env = getServerEnv();
  if (
    !isAllowedMediaUpload({
      kind: parsedKind.data,
      mimeType: file.type,
      size: file.size,
      maxBytes: env.MAX_UPLOAD_BYTES,
    })
  ) {
    return NextResponse.json(
      { error: "媒体类型或文件大小不符合限制" },
      { status: 415 },
    );
  }

  const storage = getStorageProvider();
  if (storage.name !== "local") {
    return NextResponse.json(
      {
        error: "当前存储需要使用直传流程",
        code: "DIRECT_UPLOAD_REQUIRED",
      },
      { status: 409 },
    );
  }

  const extension = path.extname(file.name).toLowerCase().slice(0, 12);
  const objectKey = `${parsedKind.data}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  const data = new Uint8Array(await file.arrayBuffer());
  let stored;
  try {
    stored = await storage.put(objectKey, data, { mimeType: file.type });
  } catch (error) {
    await reportOperationalFailure({
      category: "storage",
      severity: "error",
      code: "MEDIA_UPLOAD_FAILED",
      summary: "媒体写入存储 Provider 失败",
      error,
      provider: storage.name,
      sourceType: "admin",
      sourceId: authorization.user.id,
    });
    return NextResponse.json(
      { error: "媒体存储暂时不可用，请稍后重试" },
      { status: 503 },
    );
  }

  try {
    await connectMongo();
    const asset = await MediaAssetModel.create({
      ownerId: authorization.user.id,
      kind: parsedKind.data,
      status: "ready",
      provider: storage.name,
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
    await storage.delete(objectKey).catch(() => undefined);
    await reportOperationalFailure({
      category: "storage",
      severity: "error",
      code: "MEDIA_ASSET_PERSIST_FAILED",
      summary: "媒体写入成功但资产记录创建失败",
      error,
      provider: storage.name,
      sourceType: "admin",
      sourceId: authorization.user.id,
    });
    throw error;
  }
}
