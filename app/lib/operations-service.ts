import { createHash } from "node:crypto";

import { isValidObjectId } from "mongoose";

import type { OperationalFailureInput } from "@/modules/operations";
import {
  sanitizeLogContext,
  sanitizeOperationalText,
} from "@/modules/operations";
import { getPublicRuntimeConfig } from "@/config/env";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
  PaymentEventModel,
} from "@/providers/database/mongodb/models/commerce";
import { EntitlementModel } from "@/providers/database/mongodb/models/entitlement";
import { CourseProgressModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { OperationFailureModel } from "@/providers/database/mongodb/models/operation";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";
import { UserModel } from "@/providers/database/mongodb/models/user";
import { getErrorReporter } from "@/providers/observability";
import { consoleErrorReporter } from "@/providers/observability/console";
import { getProviderReadiness } from "@/providers/readiness";

function failureFingerprint(input: OperationalFailureInput): string {
  return createHash("sha256")
    .update(
      [
        input.category,
        input.code,
        input.provider ?? "",
        input.sourceType ?? "",
        input.sourceId ?? "",
      ].join(":"),
    )
    .digest("hex");
}

export async function reportOperationalFailure(
  input: OperationalFailureInput,
): Promise<string | null> {
  const fingerprint = failureFingerprint(input);
  const now = new Date();
  const detail = sanitizeOperationalText(input.error);
  let occurrenceCount = 1;
  let recordId: string | null = null;

  try {
    await connectMongo();
    const record = await OperationFailureModel.findOneAndUpdate(
      { fingerprint },
      {
        $set: {
          category: input.category,
          severity: input.severity,
          code: input.code.slice(0, 100),
          summary: input.summary.slice(0, 240),
          detail,
          provider: input.provider?.slice(0, 80) ?? null,
          sourceType: input.sourceType?.slice(0, 80) ?? null,
          sourceId: input.sourceId?.slice(0, 160) ?? null,
          status: "open",
          lastOccurredAt: now,
          resolvedAt: null,
          resolvedBy: null,
          resolutionNote: null,
        },
        $setOnInsert: {
          fingerprint,
          firstOccurredAt: now,
        },
        $inc: { occurrenceCount: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: false },
    );
    occurrenceCount = record.occurrenceCount;
    recordId = record._id.toString();
  } catch (persistenceError) {
    await consoleErrorReporter.report({
      fingerprint,
      category: input.category,
      severity: "critical",
      code: "FAILURE_QUEUE_WRITE_FAILED",
      message: sanitizeOperationalText(persistenceError),
      provider: "mongodb",
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      occurredAt: now.toISOString(),
      occurrenceCount,
    });
  }

  const report = {
    fingerprint,
    category: input.category,
    severity: input.severity,
    code: input.code,
    message: `${input.summary}: ${detail}`.slice(0, 1_000),
    provider: input.provider ?? null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    occurredAt: now.toISOString(),
    occurrenceCount,
  } as const;

  try {
    await getErrorReporter().report(report);
  } catch (reporterError) {
    await consoleErrorReporter.report({
      ...report,
      severity: "critical",
      code: "ERROR_REPORTER_FAILED",
      message: sanitizeOperationalText(reporterError),
    });
  }

  return recordId;
}

export async function resolveOperationalFailures(input: {
  category: OperationalFailureInput["category"];
  code: string;
  sourceType?: string | null;
  sourceId?: string | null;
}): Promise<void> {
  await connectMongo();
  await OperationFailureModel.updateMany(
    {
      category: input.category,
      code: input.code,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      status: "open",
    },
    {
      $set: {
        status: "resolved",
        resolvedAt: new Date(),
        resolutionNote: "系统检测到后续操作已恢复",
      },
    },
  );
}

export async function resolveOperationalFailure(input: {
  failureId: string;
  adminId: string;
  note: string;
}): Promise<boolean> {
  if (
    !isValidObjectId(input.failureId) ||
    !isValidObjectId(input.adminId)
  ) {
    return false;
  }
  await connectMongo();
  const result = await OperationFailureModel.updateOne(
    { _id: input.failureId, status: "open" },
    {
      $set: {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: input.adminId,
        resolutionNote: input.note.slice(0, 500),
      },
    },
  );
  return result.modifiedCount === 1;
}

export async function listOpenOperationalFailures(limit = 100) {
  await connectMongo();
  const records = await OperationFailureModel.find({ status: "open" })
    .sort({ severity: 1, lastOccurredAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .lean();

  return records.map((record) => ({
    id: record._id.toString(),
    category: record.category,
    severity: record.severity,
    code: record.code,
    summary: record.summary,
    detail: record.detail,
    provider: record.provider,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    occurrenceCount: record.occurrenceCount,
    firstOccurredAt: record.firstOccurredAt.toISOString(),
    lastOccurredAt: record.lastOccurredAt.toISOString(),
  }));
}

export async function getOperationsSummary() {
  await connectMongo();
  const now = new Date();
  const [
    users,
    courses,
    publishedCourses,
    orders,
    paidOrders,
    activeEntitlements,
    media,
    failedMedia,
    progress,
    completedProgress,
    openFailures,
    failedPaymentEvents,
    revenue,
  ] = await Promise.all([
    UserModel.countDocuments(),
    CourseModel.countDocuments(),
    CourseModel.countDocuments({ status: "published" }),
    OrderModel.countDocuments(),
    OrderModel.countDocuments({ status: { $in: ["paid", "fulfilled"] } }),
    EntitlementModel.countDocuments({
      revokedAt: null,
      startsAt: { $lte: now },
      $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
    }),
    MediaAssetModel.countDocuments(),
    MediaAssetModel.countDocuments({ status: "failed" }),
    CourseProgressModel.countDocuments(),
    CourseProgressModel.countDocuments({ completed: true }),
    OperationFailureModel.countDocuments({ status: "open" }),
    PaymentEventModel.countDocuments({ status: { $in: ["failed", "rejected"] } }),
    OrderModel.aggregate<{ _id: null; amount: number }>([
      { $match: { status: "fulfilled", currency: "CNY" } },
      { $group: { _id: null, amount: { $sum: "$amountInMinorUnits" } } },
    ]),
  ]);

  const runtime = getPublicRuntimeConfig();
  return {
    checkedAt: now.toISOString(),
    metrics: {
      users,
      courses,
      publishedCourses,
      orders,
      paidOrders,
      activeEntitlements,
      media,
      failedMedia,
      progress,
      completedProgress,
      openFailures,
      failedPaymentEvents,
      revenueInMinorUnits: revenue[0]?.amount ?? 0,
      currency: "CNY",
    },
    providers: getProviderReadiness(runtime),
  };
}

export async function exportAdministrativeData() {
  await connectMongo();
  const [
    users,
    series,
    courses,
    orders,
    orderItems,
    paymentEvents,
    entitlements,
    mediaAssets,
    progress,
    failures,
  ] = await Promise.all([
    UserModel.find()
      .select("_id name email role status emailVerified createdAt updatedAt")
      .sort({ createdAt: 1 })
      .limit(10_000)
      .lean(),
    SeriesModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    CourseModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    OrderModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    OrderItemModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    PaymentEventModel.find()
      .select(
        "-payloadDigest",
      )
      .sort({ createdAt: 1 })
      .limit(10_000)
      .lean(),
    EntitlementModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    MediaAssetModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    CourseProgressModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
    OperationFailureModel.find().sort({ createdAt: 1 }).limit(10_000).lean(),
  ]);

  return {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    notice:
      "管理员数据导出，不包含密码哈希、Session、身份令牌、限流记录或支付回调原文；不可替代数据库备份。",
    limits: { perCollection: 10_000 },
    collections: {
      users,
      series,
      courses,
      orders,
      orderItems,
      paymentEvents,
      entitlements,
      mediaAssets,
      courseProgress: progress,
      operationFailures: failures,
    },
  };
}

export function structuredLog(
  level: "info" | "warn" | "error",
  event: string,
  context: Record<string, unknown> = {},
): void {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeLogContext(context),
  });

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.info(payload);
  }
}
