import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  completeMediaUpload,
  MediaAdminError,
} from "@/app/lib/media-admin-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) return authorization.response;

  const { assetId } = await context.params;
  try {
    const asset = await completeMediaUpload({
      ownerId: authorization.user.id,
      assetId,
    });
    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof MediaAdminError) {
      const status =
        error.code === "ASSET_NOT_FOUND"
          ? 404
          : error.code === "STORAGE_MISMATCH"
            ? 409
            : error.code === "UPLOAD_NOT_READY"
              ? 400
              : 503;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
