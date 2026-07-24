import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { getStorageProvider } from "@/providers/storage";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { assetId } = await context.params;
  if (!isValidObjectId(assetId)) {
    return NextResponse.json({ error: "媒体资产不存在" }, { status: 404 });
  }

  await connectMongo();
  const asset = await MediaAssetModel.findOne({
    _id: assetId,
    ownerId: authorization.user.id,
    status: { $in: ["pending", "ready"] },
  });
  if (!asset) {
    return NextResponse.json({ error: "媒体资产不存在" }, { status: 404 });
  }
  if (asset.status === "ready") {
    return NextResponse.json({
      asset: { id: asset._id.toString(), status: asset.status },
    });
  }

  const storage = getStorageProvider();
  if (storage.name !== asset.provider) {
    return NextResponse.json(
      { error: "媒体资产与当前存储配置不一致" },
      { status: 409 },
    );
  }

  const object = await storage.stat(asset.objectKey);
  if (!object || object.size !== asset.size) {
    return NextResponse.json(
      { error: "上传文件尚未就绪或大小不一致" },
      { status: 400 },
    );
  }

  asset.status = "ready";
  asset.checksum = object.checksum ?? "remote-verified-size";
  await asset.save();

  return NextResponse.json({
    asset: {
      id: asset._id.toString(),
      kind: asset.kind,
      originalName: asset.originalName,
      size: asset.size,
      status: asset.status,
    },
  });
}
