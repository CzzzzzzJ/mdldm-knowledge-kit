import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  MediaAdminError,
  uploadLocalMedia,
} from "@/app/lib/media-admin-service";
import { getServerEnv } from "@/config/env";
import {
  isAllowedMediaUpload,
  mediaKindSchema,
} from "@/modules/media/upload-policy";

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) return authorization.response;

  const form = await request.formData();
  const file = form.get("file");
  const parsedKind = mediaKindSchema.safeParse(form.get("kind"));
  if (!(file instanceof File) || !parsedKind.success) {
    return NextResponse.json({ error: "媒体上传参数错误" }, { status: 400 });
  }
  if (
    !isAllowedMediaUpload({
      kind: parsedKind.data,
      mimeType: file.type,
      size: file.size,
      maxBytes: getServerEnv().MAX_UPLOAD_BYTES,
    })
  ) {
    return NextResponse.json(
      { error: "媒体类型或文件大小不符合限制" },
      { status: 415 },
    );
  }

  try {
    const asset = await uploadLocalMedia({
      ownerId: authorization.user.id,
      kind: parsedKind.data,
      originalName: file.name,
      mimeType: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaAdminError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "DIRECT_UPLOAD_REQUIRED" ? 409 : 503 },
      );
    }
    throw error;
  }
}
