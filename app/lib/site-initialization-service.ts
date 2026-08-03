import { randomUUID, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import { getResolvedSiteSettings } from "@/app/lib/site-settings-service";
import {
  getConfigWarnings,
  getServerEnv,
  isAuthSecretConfigured,
  isInitialSetupTokenConfigured,
} from "@/config/env";
import { generateTemporaryPassword } from "@/modules/identity/credentials";
import {
  setupLessonSlugs,
  type SetupReadiness,
  type SiteInitializationState,
} from "@/modules/site/initialization";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { ProductModel } from "@/providers/database/mongodb/models/commerce";
import { CourseModel } from "@/providers/database/mongodb/models/series";
import { SiteInitializationModel } from "@/providers/database/mongodb/models/site-initialization";
import { SessionModel } from "@/providers/database/mongodb/models/session";
import { UserModel, type UserDocument } from "@/providers/database/mongodb/models/user";

const singletonKey = "default";
const initialAdminClaimTtlMs = 10 * 60 * 1_000;

export class SiteInitializationError extends Error {
  constructor(
    public readonly code:
      | "ADMIN_ALREADY_EXISTS"
      | "INITIALIZATION_IN_PROGRESS"
      | "SETUP_TOKEN_INVALID"
      | "SETUP_TOKEN_REQUIRED"
      | "SITE_NOT_READY",
    message: string,
  ) {
    super(message);
  }
}

export interface InitialAdminResult {
  admin: UserDocument;
  temporaryPassword: string;
}

export type InitialAdminActivationResult =
  | { status: "activated"; admin: UserDocument }
  | { status: "not_pending" }
  | { status: "password_unchanged" };

function normalizeCompletedLessons(value: readonly string[]): string[] {
  const allowed = new Set<string>(setupLessonSlugs);
  return Array.from(new Set(value.filter((lesson) => allowed.has(lesson))));
}

export async function getSiteInitializationState(): Promise<SiteInitializationState> {
  await connectMongo();
  const record = await SiteInitializationModel.findOne({ singletonKey }).lean();
  if (record) {
    const hasAdmin = Boolean(await UserModel.exists({ role: "admin" }));
    return {
      status: record.status,
      hasAdmin,
      completedLessons: normalizeCompletedLessons(record.completedLessons),
      launchedAt: record.launchedAt ?? null,
      source: "database",
    };
  }

  const hasAdmin = Boolean(
    await UserModel.exists({ role: "admin" }),
  );

  return {
    status: hasAdmin ? "configuring" : "uninitialized",
    hasAdmin,
    completedLessons: [],
    launchedAt: null,
    source: "inferred",
  };
}

export function isInitialAdminSetupProtected(): boolean {
  const env = getServerEnv();
  return env.NODE_ENV === "production" || isInitialSetupTokenConfigured(env);
}

export function isInitialAdminSetupAvailable(): boolean {
  const env = getServerEnv();
  return env.NODE_ENV !== "production" || isInitialSetupTokenConfigured(env);
}

function assertInitialSetupToken(input: string | undefined): void {
  const env = getServerEnv();
  if (!isInitialAdminSetupProtected()) {
    return;
  }
  if (!isInitialSetupTokenConfigured(env) || !env.INITIAL_SETUP_TOKEN) {
    throw new SiteInitializationError(
      "SETUP_TOKEN_REQUIRED",
      "生产环境必须先配置 INITIAL_SETUP_TOKEN",
    );
  }

  const expected = Buffer.from(env.INITIAL_SETUP_TOKEN);
  const received = Buffer.from(input ?? "");
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new SiteInitializationError(
      "SETUP_TOKEN_INVALID",
      "初始化口令不正确",
    );
  }
}

export async function initializeFirstAdmin(input: {
  email: string;
  setupToken?: string;
}): Promise<InitialAdminResult> {
  assertInitialSetupToken(input.setupToken);
  await connectMongo();

  if (await UserModel.exists({ role: "admin" })) {
    throw new SiteInitializationError(
      "ADMIN_ALREADY_EXISTS",
      "首个管理员已经创建，请直接登录",
    );
  }

  const claimId = randomUUID();
  const now = new Date();
  const claimExpiresAt = new Date(now.getTime() + initialAdminClaimTtlMs);

  try {
    const claim = await SiteInitializationModel.findOneAndUpdate(
      {
        singletonKey,
        ownerAdminId: null,
        $or: [
          { adminClaimId: null },
          { adminClaimExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          adminClaimId: claimId,
          adminClaimExpiresAt: claimExpiresAt,
          status: "configuring",
        },
        $setOnInsert: {
          singletonKey,
          completedLessons: [],
          launchedAt: null,
        },
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true,
        runValidators: true,
      },
    ).select("+adminClaimId");

    if (!claim || claim.adminClaimId !== claimId) {
      throw new SiteInitializationError(
        "INITIALIZATION_IN_PROGRESS",
        "另一个初始化请求正在处理，请稍后重试",
      );
    }
  } catch (error) {
    if (error instanceof SiteInitializationError) {
      throw error;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new SiteInitializationError(
        "INITIALIZATION_IN_PROGRESS",
        "另一个初始化请求正在处理，请稍后重试",
      );
    }
    throw error;
  }

  try {
    if (await UserModel.exists({ role: "admin" })) {
      throw new SiteInitializationError(
        "ADMIN_ALREADY_EXISTS",
        "首个管理员已经创建，请直接登录",
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const admin = await UserModel.create({
      name: "管理员 1 号",
      email: input.email,
      passwordHash,
      role: "admin",
      status: "active",
      emailVerified: true,
      requiresPasswordChange: true,
    });

    await SiteInitializationModel.updateOne(
      { singletonKey, adminClaimId: claimId },
      {
        $set: {
          ownerAdminId: admin._id,
          adminCreatedAt: new Date(),
          status: "configuring",
          adminClaimId: null,
          adminClaimExpiresAt: null,
        },
      },
      { runValidators: true },
    );

    return { admin, temporaryPassword };
  } catch (error) {
    await SiteInitializationModel.updateOne(
      { singletonKey, adminClaimId: claimId },
      {
        $set: {
          adminClaimId: null,
          adminClaimExpiresAt: null,
        },
      },
    );
    throw error;
  }
}

export async function activateInitialAdminPassword(input: {
  adminId: string;
  password: string;
}): Promise<InitialAdminActivationResult> {
  if (!Types.ObjectId.isValid(input.adminId)) {
    return { status: "not_pending" };
  }

  await connectMongo();
  const admin = await UserModel.findOne({
    _id: input.adminId,
    role: "admin",
    status: "active",
    requiresPasswordChange: true,
  }).select("+passwordHash");

  if (!admin) {
    return { status: "not_pending" };
  }
  if (await bcrypt.compare(input.password, admin.passwordHash)) {
    return { status: "password_unchanged" };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const updated = await UserModel.findOneAndUpdate(
    {
      _id: admin._id,
      role: "admin",
      status: "active",
      requiresPasswordChange: true,
      passwordHash: admin.passwordHash,
    },
    {
      $set: {
        passwordHash,
        requiresPasswordChange: false,
      },
    },
    { new: true, runValidators: true },
  );

  if (!updated) {
    return { status: "not_pending" };
  }

  await SessionModel.deleteMany({ userId: updated._id });
  return { status: "activated", admin: updated };
}

export async function ensureSiteInitializationForAdmin(
  adminId: string,
): Promise<SiteInitializationState> {
  await connectMongo();
  await SiteInitializationModel.findOneAndUpdate(
    { singletonKey },
    {
      $setOnInsert: {
        singletonKey,
        status: "configuring",
        completedLessons: [],
        adminCreatedAt: new Date(),
        launchedAt: null,
      },
      $set: {
        ownerAdminId: new Types.ObjectId(adminId),
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return getSiteInitializationState();
}

export async function setSetupLessonCompleted(input: {
  adminId: string;
  lesson: string;
  completed: boolean;
}): Promise<SiteInitializationState> {
  await ensureSiteInitializationForAdmin(input.adminId);
  await SiteInitializationModel.updateOne(
    { singletonKey },
    input.completed
      ? { $addToSet: { completedLessons: input.lesson } }
      : { $pull: { completedLessons: input.lesson } },
    { runValidators: true },
  );
  return getSiteInitializationState();
}

export async function getSetupReadiness(): Promise<SetupReadiness> {
  const env = getServerEnv();
  await connectMongo();
  const [
    state,
    activeAdmin,
    siteSettings,
    publishedCourses,
    activeProducts,
  ] =
    await Promise.all([
      getSiteInitializationState(),
      UserModel.exists({ role: "admin", status: "active" }),
      getResolvedSiteSettings(),
      CourseModel.countDocuments({ status: "published" }),
      ProductModel.countDocuments({ active: true }),
    ]);
  const warnings = getConfigWarnings(env);
  const providersReady = isAuthSecretConfigured(env);
  const lessonsReady = setupLessonSlugs.every((lesson) =>
    state.completedLessons.includes(lesson),
  );

  const items: SetupReadiness["items"] = [
    {
      key: "admin",
      label: "管理员账号",
      detail: activeAdmin
        ? "首个管理员已经创建且状态正常。"
        : "还没有状态正常的管理员。",
      ready: Boolean(activeAdmin),
      href: "/admin/users",
    },
    {
      key: "providers",
      label: "系统与 Provider",
      detail: providersReady
        ? "最低核心配置已就绪；未启用的外部能力不会阻断开站，限制会在系统页单独提示。"
        : "AUTH_SECRET 尚未就绪，身份和会话能力不可用。",
      ready: providersReady,
      href: "/admin/system",
    },
    {
      key: "site",
      label: "品牌与联系方式",
      detail:
        siteSettings.source === "database"
          ? "站点设置已经保存到数据库。"
          : "当前仍在使用项目默认品牌。",
      ready: siteSettings.source === "database",
      href: "/admin/site",
    },
    {
      key: "course",
      label: "首门课程",
      detail:
        publishedCourses > 0
          ? `已有 ${publishedCourses} 门已发布课程。`
          : "至少发布一门包含可用视频的课程。",
      ready: publishedCourses > 0,
      href: "/admin/catalog",
    },
    {
      key: "product",
      label: "会员或单课商品",
      detail:
        activeProducts > 0
          ? `已有 ${activeProducts} 个可售商品。`
          : "至少配置一个已上架商品。",
      ready: activeProducts > 0,
      href: "/admin/products",
    },
    {
      key: "lessons",
      label: "开站指南",
      detail: lessonsReady
        ? "所有开站任务均已确认。"
        : `已完成 ${state.completedLessons.length}/${setupLessonSlugs.length} 项。`,
      ready: lessonsReady,
      href: "/admin/setup",
    },
  ];

  return {
    canLaunch: items.every((item) => item.ready),
    items,
    warnings,
  };
}

export async function launchSite(adminId: string): Promise<SiteInitializationState> {
  await ensureSiteInitializationForAdmin(adminId);
  const readiness = await getSetupReadiness();
  if (!readiness.canLaunch) {
    throw new SiteInitializationError(
      "SITE_NOT_READY",
      "仍有未完成的开站项目",
    );
  }

  await SiteInitializationModel.updateOne(
    { singletonKey },
    {
      $set: {
        status: "live",
        launchedAt: new Date(),
      },
    },
    { runValidators: true },
  );
  return getSiteInitializationState();
}

export async function isSiteLive(): Promise<boolean> {
  return (await getSiteInitializationState()).status === "live";
}
