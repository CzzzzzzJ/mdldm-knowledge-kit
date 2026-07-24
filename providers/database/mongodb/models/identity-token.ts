import { model, models, Schema, type Model, type Types } from "mongoose";

export const identityTokenPurposes = [
  "verify_email",
  "reset_password",
] as const;
export type IdentityTokenPurpose = (typeof identityTokenPurposes)[number];

export interface IdentityTokenRecord {
  userId: Types.ObjectId;
  purpose: IdentityTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const identityTokenSchema = new Schema<IdentityTokenRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: identityTokenPurposes,
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

identityTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
identityTokenSchema.index({ userId: 1, purpose: 1, usedAt: 1 });

export const IdentityTokenModel =
  (models.IdentityToken as Model<IdentityTokenRecord> | undefined) ??
  model<IdentityTokenRecord>("IdentityToken", identityTokenSchema);
