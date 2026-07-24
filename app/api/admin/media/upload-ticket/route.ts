import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

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

const schema = z
  .object({
    kind: mediaKindSchema,
    originalName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(120),
    size: z.number().int().positive(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    !isAllowedMediaUpload({
      kind: parsed.success ? parsed.data.kind : "video",
      mimeType: parsed.success ? parsed.data.mimeType : "",
      size: parsed.success ? parsed.data.size : 0,
      maxBytes: getServerEnv().MAX_UPLOAD_BYTES,
    })
  ) {
    return NextResponse.json(
      { error: "媒体类型或文件大小不符合限制" },
      { status: 400 },
    );
  }

  const storage = getStorageProvider();
  if (storage.name === "local") {
    return NextResponse.json({ mode: "proxy" });
  }

  const extension = path
    .extname(parsed.data.originalName)
    .toLowerCase()
    .slice(0, 12);
  const objectKey = `${parsed.data.kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  let uploadUrl;
  try {
    uploadUrl = await storage.createUploadUrl(objectKey, {
      expiresInSeconds: 10 * 60,
      contentType: parsed.data.mimeType,
    });
  } catch (error) {
    await reportOperationalFailure({
      category: "storage",
      severity: "error",
      code: "UPLOAD_TICKET_FAILED",
      summary: "生成媒体直传地址失败",
      error,
      provider: storage.name,
      sourceType: "admin",
      sourceId: authorization.user.id,
    });
    return NextResponse.json(
      { error: "媒体直传服务暂时不可用，请稍后重试" },
      { status: 503 },
    );
  }
  if (!uploadUrl) {
    return NextResponse.json(
      { error: "当前 Storage Provider 不支持直传" },
      { status: 503 },
    );
  }

  await connectMongo();
  const asset = await MediaAssetModel.create({
    ownerId: authorization.user.id,
    kind: parsed.data.kind,
    status: "pending",
    provider: storage.name,
    objectKey,
    originalName: path.basename(parsed.data.originalName),
    mimeType: parsed.data.mimeType,
    size: parsed.data.size,
    checksum: "pending",
  });

  return NextResponse.json(
    {
      mode: "direct",
      assetId: asset._id.toString(),
      uploadUrl,
      expiresInSeconds: 10 * 60,
    },
    { status: 201 },
  );
}
