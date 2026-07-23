import { model, models, Schema, type Model, type Types } from "mongoose";

import { accessLevels, type AccessLevel } from "@/modules/catalog";

export interface CourseMaterialRecord {
  courseId: Types.ObjectId;
  mediaAssetId: Types.ObjectId;
  title: string;
  position: number;
  accessLevel: AccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

const courseMaterialSchema = new Schema<CourseMaterialRecord>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    mediaAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    position: { type: Number, required: true, min: 0 },
    accessLevel: {
      type: String,
      enum: accessLevels,
      required: true,
      default: "public",
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

courseMaterialSchema.index({ courseId: 1, position: 1 });

export const CourseMaterialModel =
  (models.CourseMaterial as Model<CourseMaterialRecord> | undefined) ??
  model<CourseMaterialRecord>("CourseMaterial", courseMaterialSchema);

export interface CourseProgressRecord {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  seriesId: Types.ObjectId;
  currentTimeSeconds: number;
  durationSeconds: number;
  completed: boolean;
  completedAt: Date | null;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const courseProgressSchema = new Schema<CourseProgressRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    seriesId: {
      type: Schema.Types.ObjectId,
      ref: "Series",
      required: true,
      index: true,
    },
    currentTimeSeconds: { type: Number, required: true, min: 0, default: 0 },
    durationSeconds: { type: Number, required: true, min: 0, default: 0 },
    completed: { type: Boolean, required: true, default: false },
    completedAt: { type: Date, default: null },
    lastWatchedAt: { type: Date, required: true, default: Date.now },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
courseProgressSchema.index({ userId: 1, seriesId: 1 });

export const CourseProgressModel =
  (models.CourseProgress as Model<CourseProgressRecord> | undefined) ??
  model<CourseProgressRecord>("CourseProgress", courseProgressSchema);
