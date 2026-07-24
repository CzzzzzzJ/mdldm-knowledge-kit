import { z } from "zod";

const booleanString = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true");

const optionalEnvString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    APP_NAME: z.string().min(1).default("mdldm Knowledge Kit"),
    MONGODB_URI: z
      .string()
      .min(1)
      .default("mongodb://localhost:27017/mdldm_knowledge_kit"),
    AUTH_SECRET: z.string().optional(),
    SESSION_COOKIE_NAME: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .default("mdldm_session"),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    EMAIL_VERIFICATION_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(168)
      .default(24),
    PASSWORD_RESET_TTL_MINUTES: z.coerce
      .number()
      .int()
      .min(10)
      .max(1440)
      .default(60),
    MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .min(1_048_576)
      .max(2_147_483_648)
      .default(536_870_912),
    STORAGE_PROVIDER: z.enum(["local", "s3", "oss"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().min(1).default("./uploads"),
    OSS_REGION: optionalEnvString,
    OSS_BUCKET: optionalEnvString,
    OSS_ENDPOINT: optionalEnvString,
    OSS_ACCESS_KEY_ID: optionalEnvString,
    OSS_ACCESS_KEY_SECRET: optionalEnvString,
    OSS_SESSION_TOKEN: optionalEnvString,
    EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
    EMAIL_FROM: optionalEnvString,
    SMTP_HOST: optionalEnvString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
    SMTP_SECURE: booleanString("true"),
    SMTP_USER: optionalEnvString,
    SMTP_PASSWORD: optionalEnvString,
    PAYMENT_PROVIDER: z
      .enum(["manual", "mock", "xorpay"])
      .default("mock"),
    TRANSCODE_PROVIDER: z
      .enum(["none", "ffmpeg", "aliyun-mps"])
      .default("none"),
    OBSERVABILITY_PROVIDER: z
      .enum(["console", "webhook", "sentry"])
      .default("console"),
    FEATURE_MEMBERSHIP: booleanString("true"),
    FEATURE_SINGLE_COURSE: booleanString("true"),
    FEATURE_COMMENTS: booleanString("false"),
    FEATURE_ASSIGNMENTS: booleanString("false"),
  })
  .superRefine((env, context) => {
    if (
      env.NODE_ENV === "production" &&
      (!env.AUTH_SECRET ||
        env.AUTH_SECRET.length < 32 ||
        env.AUTH_SECRET.includes("replace-with"))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "生产环境 AUTH_SECRET 必须是至少 32 位的非占位值",
        path: ["AUTH_SECRET"],
      });
    }

    if (
      env.NODE_ENV === "production" &&
      new URL(env.APP_URL).protocol !== "https:"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "生产环境 APP_URL 必须使用 HTTPS",
        path: ["APP_URL"],
      });
    }

    if (env.STORAGE_PROVIDER === "oss") {
      for (const key of [
        "OSS_REGION",
        "OSS_BUCKET",
        "OSS_ACCESS_KEY_ID",
        "OSS_ACCESS_KEY_SECRET",
      ] as const) {
        if (!env[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `使用 OSS 时必须配置 ${key}`,
            path: [key],
          });
        }
      }
    }

    if (env.EMAIL_PROVIDER === "smtp") {
      for (const key of [
        "EMAIL_FROM",
        "SMTP_HOST",
        "SMTP_USER",
        "SMTP_PASSWORD",
      ] as const) {
        if (!env[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `使用 SMTP 时必须配置 ${key}`,
            path: [key],
          });
        }
      }
    }
  });

export type ServerEnv = z.infer<typeof envSchema>;

export interface PublicRuntimeConfig {
  appName: string;
  appUrl: string;
  environment: ServerEnv["NODE_ENV"];
  providers: {
    storage: ServerEnv["STORAGE_PROVIDER"];
    email: ServerEnv["EMAIL_PROVIDER"];
    payment: ServerEnv["PAYMENT_PROVIDER"];
    transcode: ServerEnv["TRANSCODE_PROVIDER"];
    observability: ServerEnv["OBSERVABILITY_PROVIDER"];
  };
}

let cachedEnv: ServerEnv | undefined;

export function parseEnv(input: NodeJS.ProcessEnv): ServerEnv {
  return envSchema.parse(input);
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  const env = getServerEnv();

  return {
    appName: env.APP_NAME,
    appUrl: env.APP_URL,
    environment: env.NODE_ENV,
    providers: {
      storage: env.STORAGE_PROVIDER,
      email: env.EMAIL_PROVIDER,
      payment: env.PAYMENT_PROVIDER,
      transcode: env.TRANSCODE_PROVIDER,
      observability: env.OBSERVABILITY_PROVIDER,
    },
  };
}

export function getConfigWarnings(env: ServerEnv): string[] {
  const warnings: string[] = [];

  if (
    !env.AUTH_SECRET ||
    env.AUTH_SECRET.length < 32 ||
    env.AUTH_SECRET.includes("replace-with")
  ) {
    warnings.push(
      "AUTH_SECRET 未设置。页面可浏览，但身份、会话和邀请码功能不可用。",
    );
  }

  if (env.STORAGE_PROVIDER === "s3") {
    warnings.push(
      "s3 Storage Provider 尚未实现，请使用 local 或 oss。",
    );
  }

  if (env.NODE_ENV === "production" && env.STORAGE_PROVIDER === "local") {
    warnings.push(
      "生产环境正在使用 Local Storage；Vercel 等无持久磁盘平台必须改用 OSS。",
    );
  }

  if (
    env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1/.test(env.MONGODB_URI)
  ) {
    warnings.push(
      "生产环境 MongoDB 指向本机；仅适用于数据库与应用同机部署，Vercel 必须使用 Atlas 等远程地址。",
    );
  }

  if (env.NODE_ENV === "production" && env.EMAIL_PROVIDER === "console") {
    warnings.push(
      "生产环境正在使用 Console Email，用户无法收到验证和找回密码邮件。",
    );
  }

  if (!["manual", "mock"].includes(env.PAYMENT_PROVIDER)) {
    warnings.push(
      `${env.PAYMENT_PROVIDER} Payment Provider 尚未实现。`,
    );
  }

  if (env.TRANSCODE_PROVIDER !== "none") {
    warnings.push(
      `${env.TRANSCODE_PROVIDER} Transcode Provider 尚未实现。`,
    );
  }

  if (env.OBSERVABILITY_PROVIDER !== "console") {
    warnings.push(
      `${env.OBSERVABILITY_PROVIDER} Observability Provider 尚未实现。`,
    );
  }

  return warnings;
}

export function requireAuthSecret(): string {
  const secret = getServerEnv().AUTH_SECRET;

  if (!secret || secret.length < 32 || secret.includes("replace-with")) {
    throw new Error("AUTH_SECRET 必须是至少 32 位的非占位值");
  }

  return secret;
}
