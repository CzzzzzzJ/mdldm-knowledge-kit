import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  mediaKinds,
  mediaStatuses,
  type MediaKind,
  type MediaStatus,
} from "@/modules/media";

export interface MediaAssetRecord {
  ownerId: Types.ObjectId;
  kind: MediaKind;
  status: MediaStatus;
  provider: "local" | "oss";
  objectKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<MediaAssetRecord>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: { type: String, enum: mediaKinds, required: true },
    status: { type: String, enum: mediaStatuses, required: true },
    provider: { type: String, enum: ["local", "oss"], required: true },
    objectKey: { type: String, required: true, unique: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    checksum: { type: String, required: true, maxlength: 128 },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

export const MediaAssetModel =
  (models.MediaAsset as Model<MediaAssetRecord> | undefined) ??
  model<MediaAssetRecord>("MediaAsset", mediaAssetSchema);
