import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  accessLevels,
  publishStatuses,
  type AccessLevel,
  type PublishStatus,
} from "@/modules/catalog";

export interface SeriesRecord {
  title: string;
  slug: string;
  description: string;
  status: PublishStatus;
  accessLevel: AccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

const seriesSchema = new Schema<SeriesRecord>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2_000 },
    status: {
      type: String,
      enum: publishStatuses,
      required: true,
      default: "draft",
    },
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

seriesSchema.index({ slug: 1 }, { unique: true });

export const SeriesModel =
  (models.Series as Model<SeriesRecord> | undefined) ??
  model<SeriesRecord>("Series", seriesSchema);

export interface CourseRecord {
  seriesId: Types.ObjectId;
  title: string;
  slug: string;
  summary: string;
  position: number;
  status: PublishStatus;
  accessLevel: AccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<CourseRecord>(
  {
    seriesId: {
      type: Schema.Types.ObjectId,
      ref: "Series",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    summary: { type: String, required: true, maxlength: 1_000 },
    position: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: publishStatuses,
      required: true,
      default: "draft",
    },
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

courseSchema.index({ seriesId: 1, slug: 1 }, { unique: true });
courseSchema.index({ seriesId: 1, position: 1 });

export const CourseModel =
  (models.Course as Model<CourseRecord> | undefined) ??
  model<CourseRecord>("Course", courseSchema);
