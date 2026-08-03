import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse, type NextRequest } from "next/server";

import { getVideoAssetForViewer } from "@/app/lib/media-delivery-service";
import { parseByteRange } from "@/modules/media/range";
import { getStorageProvider } from "@/providers/storage";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await context.params;
  const delivery = await getVideoAssetForViewer(assetId);
  if (!delivery.ok) {
    if (delivery.reason === "forbidden") {
      return NextResponse.json({ error: "无权播放此课程" }, { status: 403 });
    }
    return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
  }
  const { asset } = delivery;

  const storage = getStorageProvider();
  if (storage.name !== asset.provider) {
    return NextResponse.json(
      { error: "媒体存储配置不一致" },
      { status: 503 },
    );
  }

  const signedUrl = await storage.createReadUrl(asset.objectKey, {
    expiresInSeconds: 5 * 60,
    contentType: asset.mimeType,
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
