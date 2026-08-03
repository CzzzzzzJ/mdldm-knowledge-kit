import { isValidObjectId } from "mongoose";

import type { LearningQueryRepository } from "@/modules/learning";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { EntitlementModel } from "@/providers/database/mongodb/models/entitlement";
import {
  CourseMaterialModel,
  CourseProgressModel,
} from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

export function createMongoLearningQueryRepository(): LearningQueryRepository {
  return {
    async getLearningCenter(userId, now) {
      if (!isValidObjectId(userId)) {
        return {
          membershipEndsAt: undefined,
          otherEntitlementCount: 0,
          recentCourses: [],
        };
      }
      await connectMongo();
      const [entitlements, progressRecords] = await Promise.all([
        EntitlementModel.find({
          userId,
          startsAt: { $lte: now },
          revokedAt: null,
          $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
        })
          .sort({ createdAt: -1 })
          .lean(),
        CourseProgressModel.find({ userId })
          .sort({ lastWatchedAt: -1 })
          .limit(6)
          .lean(),
      ]);
      const courses = await CourseModel.find({
        _id: { $in: progressRecords.map((progress) => progress.courseId) },
        status: "published",
      }).lean();
      const courseById = new Map(
        courses.map((course) => [course._id.toString(), course]),
      );
      const membership = entitlements.find(
        (entitlement) => entitlement.type === "membership",
      );

      return {
        membershipEndsAt: membership
          ? membership.endsAt?.toISOString() ?? null
          : undefined,
        otherEntitlementCount: Math.max(
          0,
          entitlements.length - (membership ? 1 : 0),
        ),
        recentCourses: progressRecords.flatMap((progress) => {
          const course = courseById.get(progress.courseId.toString());
          return course
            ? [
                {
                  progressId: progress._id.toString(),
                  courseId: course._id.toString(),
                  title: course.title,
                  accessLevel: course.accessLevel,
                  currentTimeSeconds: progress.currentTimeSeconds,
                  durationSeconds: progress.durationSeconds,
                  completed: progress.completed,
                },
              ]
            : [];
        }),
      };
    },

    async findPublishedLesson(courseId) {
      if (!isValidObjectId(courseId)) return null;
      await connectMongo();
      const course = await CourseModel.findOne({
        _id: courseId,
        status: "published",
      }).lean();
      if (!course) return null;

      const [series, materials, seriesCourses, videoAsset] = await Promise.all([
        SeriesModel.findById(course.seriesId).lean(),
        CourseMaterialModel.find({ courseId: course._id })
          .sort({ position: 1 })
          .lean(),
        CourseModel.find({
          seriesId: course.seriesId,
          status: "published",
        })
          .sort({ position: 1 })
          .lean(),
        course.videoAssetId
          ? MediaAssetModel.findById(course.videoAssetId).lean()
          : Promise.resolve(null),
      ]);

      return {
        course: {
          id: course._id.toString(),
          seriesId: course.seriesId.toString(),
          title: course.title,
          summary: course.summary,
          accessLevel: course.accessLevel,
          contentType: course.contentType ?? "video",
          articleBody: course.articleBody ?? "",
          videoAssetId: course.videoAssetId?.toString() ?? null,
        },
        series: series
          ? { id: series._id.toString(), title: series.title, slug: series.slug }
          : null,
        seriesCourses: seriesCourses.map((item) => ({
          id: item._id.toString(),
          title: item.title,
        })),
        materials: materials.map((item) => ({
          id: item._id.toString(),
          title: item.title,
        })),
        videoAsset: videoAsset
          ? { id: videoAsset._id.toString(), status: videoAsset.status }
          : null,
      };
    },

    async listActiveEntitlements(userId, now) {
      if (!isValidObjectId(userId)) return [];
      await connectMongo();
      const entitlements = await EntitlementModel.find({
        userId,
        startsAt: { $lte: now },
        revokedAt: null,
        $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
      }).lean();
      return entitlements.map((entitlement) => ({
        type: entitlement.type,
        targetId: entitlement.targetId,
        startsAt: entitlement.startsAt,
        endsAt: entitlement.endsAt,
        revokedAt: entitlement.revokedAt,
      }));
    },
  };
}
