import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  attachCourseVideo,
  CatalogAdminError,
} from "@/app/lib/catalog-admin-service";

const updateCourseInput = z.object({
  videoAssetId: z.string().refine(isValidObjectId).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { courseId } = await context.params;
  if (!isValidObjectId(courseId)) {
    return NextResponse.json({ error: "课时不存在" }, { status: 404 });
  }

  const parsed = updateCourseInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "课时更新格式错误" }, { status: 400 });
  }

  try {
    const course = await attachCourseVideo({
      courseId,
      videoAssetId: parsed.data.videoAssetId,
    });
    return NextResponse.json({ course });
  } catch (error) {
    if (error instanceof CatalogAdminError) {
      const status = error.code === "COURSE_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
