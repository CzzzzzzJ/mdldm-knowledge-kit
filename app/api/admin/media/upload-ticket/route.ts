import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  createMediaUploadTicket,
  MediaAdminError,
} from "@/app/lib/media-admin-service";
import { getServerEnv } from "@/config/env";
import {
  isAllowedMediaUpload,
  mediaKindSchema,
} from "@/modules/media/upload-policy";

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
  if (!authorization.ok) return authorization.response;

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

  try {
    const ticket = await createMediaUploadTicket({
      ownerId: authorization.user.id,
      ...parsed.data,
    });
    return NextResponse.json(ticket, {
      status: ticket.mode === "direct" ? 201 : 200,
    });
  } catch (error) {
    if (error instanceof MediaAdminError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
