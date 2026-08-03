import { isValidObjectId } from "mongoose";

import { canCurrentUserAccessCourse } from "@/app/lib/course-access";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseProgressModel } from "@/providers/database/mongodb/models/learning";
import { CourseModel } from "@/providers/database/mongodb/models/series";

export async function getCourseProgress(courseId: string) {
  const context = await findProgressContext(courseId);
  if (!context) return null;
  const progress = await CourseProgressModel.findOne({
    userId: context.userId,
    courseId,
  }).lean();
  return {
    currentTimeSeconds: progress?.currentTimeSeconds ?? 0,
    durationSeconds: progress?.durationSeconds ?? 0,
    completed: progress?.completed ?? false,
    lastWatchedAt: progress?.lastWatchedAt.toISOString() ?? null,
    exists: Boolean(progress),
  };
}

export async function saveCourseProgress(input: {
  courseId: string;
  currentTimeSeconds: number;
  durationSeconds: number;
  completed: boolean;
}) {
  const context = await findProgressContext(input.courseId);
  if (!context) return null;
  const progress = await CourseProgressModel.findOneAndUpdate(
    { userId: context.userId, courseId: input.courseId },
    {
      $set: {
        seriesId: context.seriesId,
        currentTimeSeconds: input.currentTimeSeconds,
        durationSeconds: input.durationSeconds,
        completed: input.completed,
        completedAt: input.completed ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  return {
    currentTimeSeconds: progress.currentTimeSeconds,
    durationSeconds: progress.durationSeconds,
    completed: progress.completed,
    lastWatchedAt: progress.lastWatchedAt.toISOString(),
  };
}

async function findProgressContext(courseId: string) {
  if (!isValidObjectId(courseId)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  await connectMongo();
  const course = await CourseModel.findById(courseId);
  if (
    !course ||
    (course.status !== "published" && user.role !== "admin") ||
    !(await canCurrentUserAccessCourse({
      level: course.accessLevel,
      courseId: course._id.toString(),
      seriesId: course.seriesId.toString(),
    }))
  ) {
    return null;
  }
  return { userId: user.id, seriesId: course.seriesId };
}

export async function getSeriesProgress(seriesId: string) {
  if (!isValidObjectId(seriesId)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  await connectMongo();
  const [courseCount, completedCount] = await Promise.all([
    CourseModel.countDocuments({ seriesId, status: "published" }),
    CourseProgressModel.countDocuments({
      userId: user.id,
      seriesId,
      completed: true,
    }),
  ]);
  return {
    courseCount,
    completedCount: Math.min(completedCount, courseCount),
    percentage:
      courseCount === 0 ? 0 : Math.round((completedCount / courseCount) * 100),
  };
}
