import { model, models, Schema, type Model } from "mongoose";

export interface RateLimitBucketRecord {
  keyHash: string;
  count: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rateLimitBucketSchema = new Schema<RateLimitBucketRecord>(
  {
    keyHash: { type: String, required: true, unique: true },
    count: { type: Number, required: true, min: 1 },
    resetAt: { type: Date, required: true },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

rateLimitBucketSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitBucketModel =
  (models.RateLimitBucket as Model<RateLimitBucketRecord> | undefined) ??
  model<RateLimitBucketRecord>("RateLimitBucket", rateLimitBucketSchema);
