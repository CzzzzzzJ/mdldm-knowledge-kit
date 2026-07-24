import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  entitlementTypes,
  type EntitlementType,
} from "@/modules/entitlement";

export interface EntitlementRecord {
  userId: Types.ObjectId;
  type: EntitlementType;
  targetId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
  sourceType: "order" | "invitation" | "admin" | "seed";
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const entitlementSchema = new Schema<EntitlementRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: entitlementTypes, required: true },
    targetId: {
      type: String,
      default: null,
      validate: {
        validator(this: EntitlementRecord, value: string | null) {
          return this.type === "membership"
            ? value === null
            : typeof value === "string" && value.length > 0;
        },
        message: "membership 权益不能设置目标，course/series 权益必须设置目标",
      },
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    sourceType: {
      type: String,
      enum: ["order", "invitation", "admin", "seed"],
      required: true,
    },
    sourceId: { type: String, required: true },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

entitlementSchema.index(
  { userId: 1, type: 1, targetId: 1, sourceType: 1, sourceId: 1 },
  { unique: true },
);

export const EntitlementModel =
  (models.Entitlement as Model<EntitlementRecord> | undefined) ??
  model<EntitlementRecord>("Entitlement", entitlementSchema);
