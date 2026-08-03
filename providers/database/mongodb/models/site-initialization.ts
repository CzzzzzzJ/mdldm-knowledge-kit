import {
  model,
  models,
  Schema,
  type Model,
  type Types,
} from "mongoose";

import {
  setupLessonSlugs,
  siteLifecycleStatuses,
  type SiteInitializationState,
} from "@/modules/site/initialization";

export interface SiteInitializationRecord {
  singletonKey: "default";
  status: Exclude<SiteInitializationState["status"], "uninitialized">;
  ownerAdminId: Types.ObjectId | null;
  completedLessons: string[];
  adminClaimId: string | null;
  adminClaimExpiresAt: Date | null;
  adminCreatedAt: Date | null;
  launchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const siteInitializationSchema = new Schema<SiteInitializationRecord>(
  {
    singletonKey: {
      type: String,
      enum: ["default"],
      required: true,
      default: "default",
      immutable: true,
    },
    status: {
      type: String,
      enum: siteLifecycleStatuses,
      required: true,
      default: "configuring",
    },
    ownerAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedLessons: {
      type: [String],
      enum: setupLessonSlugs,
      default: [],
    },
    adminClaimId: {
      type: String,
      default: null,
      select: false,
    },
    adminClaimExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    adminCreatedAt: {
      type: Date,
      default: null,
    },
    launchedAt: {
      type: Date,
      default: null,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

siteInitializationSchema.index({ singletonKey: 1 }, { unique: true });

export const SiteInitializationModel =
  (models.SiteInitialization as
    | Model<SiteInitializationRecord>
    | undefined) ??
  model<SiteInitializationRecord>(
    "SiteInitialization",
    siteInitializationSchema,
  );
