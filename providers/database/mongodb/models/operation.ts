import { model, models, Schema, type Model, type Types } from "mongoose";

import {
  operationFailureCategories,
  operationFailureSeverities,
  operationFailureStatuses,
  type OperationFailureCategory,
  type OperationFailureSeverity,
  type OperationFailureStatus,
} from "@/modules/operations";

export interface OperationFailureRecord {
  fingerprint: string;
  category: OperationFailureCategory;
  severity: OperationFailureSeverity;
  code: string;
  summary: string;
  detail: string;
  provider: string | null;
  sourceType: string | null;
  sourceId: string | null;
  status: OperationFailureStatus;
  occurrenceCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
  resolvedAt: Date | null;
  resolvedBy: Types.ObjectId | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const operationFailureSchema = new Schema<OperationFailureRecord>(
  {
    fingerprint: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/,
    },
    category: {
      type: String,
      enum: operationFailureCategories,
      required: true,
    },
    severity: {
      type: String,
      enum: operationFailureSeverities,
      required: true,
    },
    code: { type: String, required: true, trim: true, maxlength: 100 },
    summary: { type: String, required: true, trim: true, maxlength: 240 },
    detail: { type: String, required: true, maxlength: 1_000 },
    provider: { type: String, default: null, maxlength: 80 },
    sourceType: { type: String, default: null, maxlength: 80 },
    sourceId: { type: String, default: null, maxlength: 160 },
    status: {
      type: String,
      enum: operationFailureStatuses,
      required: true,
      default: "open",
    },
    occurrenceCount: { type: Number, required: true, default: 1, min: 1 },
    firstOccurredAt: { type: Date, required: true },
    lastOccurredAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolutionNote: { type: String, default: null, maxlength: 500 },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

operationFailureSchema.index({ fingerprint: 1 }, { unique: true });
operationFailureSchema.index({ status: 1, severity: 1, lastOccurredAt: -1 });
operationFailureSchema.index({ category: 1, status: 1, lastOccurredAt: -1 });

export const OperationFailureModel =
  (models.OperationFailure as Model<OperationFailureRecord> | undefined) ??
  model<OperationFailureRecord>("OperationFailure", operationFailureSchema);
