import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  entitlementTypes,
  type EntitlementType,
} from "@/modules/entitlement";

export interface InvitationRecord {
  codeHash: string;
  codeHint: string;
  entitlementType: EntitlementType;
  targetId: string | null;
  durationDays: number | null;
  maxRedemptions: number;
  redemptionCount: number;
  status: "active" | "disabled";
  expiresAt: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<InvitationRecord>(
  {
    codeHash: { type: String, required: true, unique: true },
    codeHint: { type: String, required: true, maxlength: 20 },
    entitlementType: {
      type: String,
      enum: entitlementTypes,
      required: true,
    },
    targetId: {
      type: String,
      default: null,
      validate: {
        validator(this: InvitationRecord, value: string | null) {
          return this.entitlementType === "membership"
            ? value === null
            : typeof value === "string" && value.length > 0;
        },
        message: "membership 邀请码不能设置目标，course/series 必须设置目标",
      },
    },
    durationDays: { type: Number, min: 1, max: 3650, default: null },
    maxRedemptions: { type: Number, required: true, min: 1, max: 100_000 },
    redemptionCount: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["active", "disabled"],
      required: true,
      default: "active",
    },
    expiresAt: { type: Date, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

export interface InvitationRedemptionRecord {
  invitationId: Types.ObjectId;
  userId: Types.ObjectId;
  entitlementId: Types.ObjectId | null;
  redeemedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationRedemptionSchema =
  new Schema<InvitationRedemptionRecord>(
    {
      invitationId: {
        type: Schema.Types.ObjectId,
        ref: "Invitation",
        required: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      entitlementId: {
        type: Schema.Types.ObjectId,
        ref: "Entitlement",
        default: null,
      },
      redeemedAt: { type: Date, required: true },
    },
    {
      strict: "throw",
      timestamps: true,
    },
  );

invitationRedemptionSchema.index(
  { invitationId: 1, userId: 1 },
  { unique: true },
);

export const InvitationModel =
  (models.Invitation as Model<InvitationRecord> | undefined) ??
  model<InvitationRecord>("Invitation", invitationSchema);

export const InvitationRedemptionModel =
  (models.InvitationRedemption as
    | Model<InvitationRedemptionRecord>
    | undefined) ??
  model<InvitationRedemptionRecord>(
    "InvitationRedemption",
    invitationRedemptionSchema,
  );
