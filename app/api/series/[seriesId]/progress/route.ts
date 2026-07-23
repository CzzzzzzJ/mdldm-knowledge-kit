import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseProgressModel } from "@/providers/database/mongodb/models/learning";
import { CourseModel } from "@/providers/database/mongodb/models/series";

export async function GET(
  _request: Request,
  context: { params: Promise<{ seriesId: string }> },
) {
  const { seriesId } = await context.params;
  if (!isValidObjectId(seriesId)) {
    return NextResponse.json({ error: "系列不存在" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  await connectMongo();
  const [courseCount, completedCount] = await Promise.all([
    CourseModel.countDocuments({ seriesId, status: "published" }),
    CourseProgressModel.countDocuments({
      userId: user.id,
      seriesId,
      completed: true,
    }),
  ]);

  return NextResponse.json({
    progress: {
      courseCount,
      completedCount: Math.min(completedCount, courseCount),
      percentage:
        courseCount === 0 ? 0 : Math.round((completedCount / courseCount) * 100),
    },
  });
}
