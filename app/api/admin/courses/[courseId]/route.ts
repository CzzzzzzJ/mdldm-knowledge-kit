import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { CourseModel } from "@/providers/database/mongodb/models/series";

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

  await connectMongo();
  if (
    parsed.data.videoAssetId &&
    !(await MediaAssetModel.exists({
      _id: parsed.data.videoAssetId,
      kind: "video",
      status: "ready",
    }))
  ) {
    return NextResponse.json({ error: "视频资产不可用" }, { status: 400 });
  }

  const course = await CourseModel.findByIdAndUpdate(
    courseId,
    { $set: parsed.data },
    { new: true, runValidators: true },
  );
  if (!course) {
    return NextResponse.json({ error: "课时不存在" }, { status: 404 });
  }

  return NextResponse.json({
    course: {
      id: course._id.toString(),
      videoAssetId: course.videoAssetId?.toString() ?? null,
      status: course.status,
    },
  });
}
