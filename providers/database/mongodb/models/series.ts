import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  accessLevels,
  courseContentLimits,
  courseContentTypes,
  discoveryLimits,
  normalizeCategory,
  normalizeCoverImageUrl,
  normalizeSeriesTags,
  publishStatuses,
  type AccessLevel,
  type CourseContentType,
  type PublishStatus,
} from "@/modules/catalog";

export interface SeriesRecord {
  title: string;
  slug: string;
  description: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string;
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
    category: {
      type: String,
      default: "",
      maxlength: discoveryLimits.taxonomy,
      set: normalizeCategory,
    },
    tags: {
      type: [String],
      default: [],
      set: normalizeSeriesTags,
      validate: {
        validator: (value: string[]) =>
          value.length <= discoveryLimits.tagsPerSeries,
        message: `系列标签最多 ${discoveryLimits.tagsPerSeries} 个`,
      },
    },
    coverImageUrl: {
      type: String,
      default: "",
      maxlength: discoveryLimits.coverImageUrl,
      set: normalizeCoverImageUrl,
    },
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
seriesSchema.index({ status: 1, category: 1, createdAt: -1 });
seriesSchema.index({ status: 1, tags: 1, createdAt: -1 });

export const SeriesModel =
  (models.Series as Model<SeriesRecord> | undefined) ??
  model<SeriesRecord>("Series", seriesSchema);

export interface CourseRecord {
  seriesId: Types.ObjectId;
  videoAssetId: Types.ObjectId | null;
  contentType: CourseContentType;
  articleBody: string;
  title: string;
  slug: string;
  summary: string;
  position: number;
  status: PublishStatus;
  accessLevel: AccessLevel;
  publishedAt: Date | null;
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
    videoAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    contentType: {
      type: String,
      enum: courseContentTypes,
      required: true,
      default: "video",
    },
    articleBody: {
      type: String,
      default: "",
      maxlength: courseContentLimits.articleBody,
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
    publishedAt: { type: Date, default: null },
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
