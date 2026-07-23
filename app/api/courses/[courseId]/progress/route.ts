import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseProgressModel } from "@/providers/database/mongodb/models/learning";
import { CourseModel } from "@/providers/database/mongodb/models/series";

const progressSchema = z
  .object({
    currentTimeSeconds: z.number().finite().min(0),
    durationSeconds: z.number().finite().min(0),
    completed: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.durationSeconds === 0 ||
      value.currentTimeSeconds <= value.durationSeconds + 5,
    "播放进度不能超过视频时长",
  );

async function findContext(courseId: string) {
  if (!isValidObjectId(courseId)) {
    return null;
  }

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  await connectMongo();
  const course = await CourseModel.findById(courseId);
  if (
    !course ||
    (course.status !== "published" && user.role !== "admin") ||
    !(await canCurrentUserAccessCourse(course))
  ) {
    return null;
  }

  return { user, course };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;
  const current = await findContext(courseId);
  if (!current) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const progress = await CourseProgressModel.findOne({
    userId: current.user.id,
    courseId,
  }).lean();

  return NextResponse.json({
    progress: progress
      ? {
          currentTimeSeconds: progress.currentTimeSeconds,
          durationSeconds: progress.durationSeconds,
          completed: progress.completed,
          lastWatchedAt: progress.lastWatchedAt,
        }
      : null,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const expectedOrigin = getExpectedRequestOrigin(
    request.headers,
    request.nextUrl.protocol,
  );
  if (
    !expectedOrigin ||
    !isSameOriginRequest(request.headers.get("origin"), expectedOrigin)
  ) {
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  }

  const { courseId } = await context.params;
  const current = await findContext(courseId);
  if (!current) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const parsed = progressSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "学习进度格式错误" }, { status: 400 });
  }

  const completionRatio =
    parsed.data.durationSeconds > 0
      ? parsed.data.currentTimeSeconds / parsed.data.durationSeconds
      : 0;
  const completed = parsed.data.completed === true || completionRatio >= 0.9;

  const progress = await CourseProgressModel.findOneAndUpdate(
    {
      userId: current.user.id,
      courseId,
    },
    {
      $set: {
        seriesId: current.course.seriesId,
        currentTimeSeconds: parsed.data.currentTimeSeconds,
        durationSeconds: parsed.data.durationSeconds,
        completed,
        completedAt: completed ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  return NextResponse.json({
    progress: {
      currentTimeSeconds: progress.currentTimeSeconds,
      durationSeconds: progress.durationSeconds,
      completed: progress.completed,
      lastWatchedAt: progress.lastWatchedAt,
    },
  });
}
