import { randomUUID } from "node:crypto";
import path from "node:path";

import { isValidObjectId } from "mongoose";

import { reportOperationalFailure } from "@/app/lib/operations-service";
import type { MediaKind } from "@/modules/media";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { getStorageProvider } from "@/providers/storage";

export class MediaAdminError extends Error {
  constructor(
    readonly code:
      | "DIRECT_UPLOAD_REQUIRED"
      | "STORAGE_UNAVAILABLE"
      | "DIRECT_UPLOAD_UNSUPPORTED"
      | "ASSET_NOT_FOUND"
      | "STORAGE_MISMATCH"
      | "UPLOAD_NOT_READY",
    message: string,
  ) {
    super(message);
    this.name = "MediaAdminError";
  }
}

function createObjectKey(kind: MediaKind, originalName: string) {
  const extension = path.extname(originalName).toLowerCase().slice(0, 12);
  return `${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
}

function serializeAsset(asset: {
  _id: { toString(): string };
  kind: MediaKind;
  originalName: string;
  size: number;
  status: string;
}) {
  return {
    id: asset._id.toString(),
    kind: asset.kind,
    originalName: asset.originalName,
    size: asset.size,
    status: asset.status,
  };
}

export async function uploadLocalMedia(input: {
  ownerId: string;
  kind: MediaKind;
  originalName: string;
  mimeType: string;
  data: Uint8Array;
}) {
  const storage = getStorageProvider();
  if (storage.name !== "local") {
    throw new MediaAdminError(
      "DIRECT_UPLOAD_REQUIRED",
      "当前存储需要使用直传流程",
    );
  }
  const objectKey = createObjectKey(input.kind, input.originalName);
  let stored;
  try {
    stored = await storage.put(objectKey, input.data, {
      mimeType: input.mimeType,
    });
  } catch (error) {
    await reportOperationalFailure({
      category: "storage",
      severity: "error",
      code: "MEDIA_UPLOAD_FAILED",
      summary: "媒体写入存储 Provider 失败",
      error,
      provider: storage.name,
      sourceType: "admin",
      sourceId: input.ownerId,
    });
    throw new MediaAdminError(
      "STORAGE_UNAVAILABLE",
      "媒体存储暂时不可用，请稍后重试",
    );
  }

  try {
    await connectMongo();
    const asset = await MediaAssetModel.create({
      ownerId: input.ownerId,
      kind: input.kind,
      status: "ready",
      provider: storage.name,
      objectKey,
      originalName: path.basename(input.originalName).slice(0, 255),
      mimeType: input.mimeType,
      size: stored.size,
      checksum: stored.checksum,
    });
    return serializeAsset(asset);
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
      sourceId: input.ownerId,
    });
    throw error;
  }
}

export async function createMediaUploadTicket(input: {
  ownerId: string;
  kind: MediaKind;
  originalName: string;
  mimeType: string;
  size: number;
}) {
  const storage = getStorageProvider();
  if (storage.name === "local") return { mode: "proxy" as const };
  const objectKey = createObjectKey(input.kind, input.originalName);
  let uploadUrl: string | null;
  try {
    uploadUrl = await storage.createUploadUrl(objectKey, {
      expiresInSeconds: 10 * 60,
      contentType: input.mimeType,
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
      sourceId: input.ownerId,
    });
    throw new MediaAdminError(
      "STORAGE_UNAVAILABLE",
      "媒体直传服务暂时不可用，请稍后重试",
    );
  }
  if (!uploadUrl) {
    throw new MediaAdminError(
      "DIRECT_UPLOAD_UNSUPPORTED",
      "当前 Storage Provider 不支持直传",
    );
  }

  await connectMongo();
  const asset = await MediaAssetModel.create({
    ownerId: input.ownerId,
    kind: input.kind,
    status: "pending",
    provider: storage.name,
    objectKey,
    originalName: path.basename(input.originalName),
    mimeType: input.mimeType,
    size: input.size,
    checksum: "pending",
  });
  return {
    mode: "direct" as const,
    assetId: asset._id.toString(),
    uploadUrl,
    expiresInSeconds: 10 * 60,
  };
}

export async function completeMediaUpload(input: {
  ownerId: string;
  assetId: string;
}) {
  if (!isValidObjectId(input.assetId)) {
    throw new MediaAdminError("ASSET_NOT_FOUND", "媒体资产不存在");
  }
  await connectMongo();
  const asset = await MediaAssetModel.findOne({
    _id: input.assetId,
    ownerId: input.ownerId,
    status: { $in: ["pending", "ready"] },
  });
  if (!asset) {
    throw new MediaAdminError("ASSET_NOT_FOUND", "媒体资产不存在");
  }
  if (asset.status === "ready") return serializeAsset(asset);

  const storage = getStorageProvider();
  if (storage.name !== asset.provider) {
    throw new MediaAdminError(
      "STORAGE_MISMATCH",
      "媒体资产与当前存储配置不一致",
    );
  }
  let object;
  try {
    object = await storage.stat(asset.objectKey);
  } catch (error) {
    await reportOperationalFailure({
      category: "storage",
      severity: "error",
      code: "MEDIA_VERIFY_FAILED",
      summary: "验证直传媒体状态失败",
      error,
      provider: storage.name,
      sourceType: "media_asset",
      sourceId: asset._id.toString(),
    });
    throw new MediaAdminError(
      "STORAGE_UNAVAILABLE",
      "媒体存储暂时不可用，请稍后重试",
    );
  }
  if (!object || object.size !== asset.size) {
    throw new MediaAdminError(
      "UPLOAD_NOT_READY",
      "上传文件尚未就绪或大小不一致",
    );
  }
  asset.status = "ready";
  asset.checksum = object.checksum ?? "remote-verified-size";
  await asset.save();
  return serializeAsset(asset);
}
