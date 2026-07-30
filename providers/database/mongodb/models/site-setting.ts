import { model, models, Schema, type Model } from "mongoose";

import type { SiteSettingsInput } from "@/modules/site/settings";

export interface SiteSettingRecord extends SiteSettingsInput {
  singletonKey: "default";
  createdAt: Date;
  updatedAt: Date;
}

const httpUrlValidator = {
  validator(value: string | null): boolean {
    if (value === null) {
      return true;
    }

    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  },
  message: "URL 必须是有效的 http 或 https 地址",
};

const socialLinkSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 40,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_048,
      validate: httpUrlValidator,
    },
  },
  {
    _id: false,
    strict: "throw",
  },
);

const siteSettingSchema = new Schema<SiteSettingRecord>(
  {
    singletonKey: {
      type: String,
      enum: ["default"],
      required: true,
      default: "default",
      immutable: true,
    },
    siteName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    creatorName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    creatorBio: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1_000,
    },
    supportEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    homeTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    homeSubtitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    avatarUrl: {
      type: String,
      default: null,
      maxlength: 2_048,
      validate: httpUrlValidator,
    },
    heroImageUrl: {
      type: String,
      default: null,
      maxlength: 2_048,
      validate: httpUrlValidator,
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
      validate: {
        validator(value: SiteSettingsInput["socialLinks"]): boolean {
          return value.length <= 8;
        },
        message: "社交链接不能超过 8 个",
      },
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

siteSettingSchema.index({ singletonKey: 1 }, { unique: true });

export const SiteSettingModel =
  (models.SiteSetting as Model<SiteSettingRecord> | undefined) ??
  model<SiteSettingRecord>("SiteSetting", siteSettingSchema);
