import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getCourseProgress,
  saveCourseProgress,
} from "@/app/lib/learning-service";
import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;
  const progress = await getCourseProgress(courseId);
  if (!progress) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json({
    progress: progress.exists
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

  const progress = await saveCourseProgress({
    courseId,
    currentTimeSeconds: parsed.data.currentTimeSeconds,
    durationSeconds: parsed.data.durationSeconds,
    completed,
  });
  if (!progress) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json({
    progress: {
      currentTimeSeconds: progress.currentTimeSeconds,
      durationSeconds: progress.durationSeconds,
      completed: progress.completed,
      lastWatchedAt: progress.lastWatchedAt,
    },
  });
}
