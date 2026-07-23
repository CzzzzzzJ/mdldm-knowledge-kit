import { z } from "zod";

const booleanString = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true");

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
    STORAGE_PROVIDER: z.enum(["local", "s3", "oss"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().min(1).default("./uploads"),
    EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
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

  if (!env.AUTH_SECRET) {
    warnings.push(
      "AUTH_SECRET 未设置。开发首页可运行，但认证功能实现前必须生成本地密钥。",
    );
  }

  if (env.STORAGE_PROVIDER !== "local") {
    warnings.push(
      `${env.STORAGE_PROVIDER} Storage Provider 尚未在 Phase 1 实现。`,
    );
  }

  if (!["console"].includes(env.EMAIL_PROVIDER)) {
    warnings.push(`${env.EMAIL_PROVIDER} Email Provider 尚未在 Phase 1 实现。`);
  }

  if (!["manual", "mock"].includes(env.PAYMENT_PROVIDER)) {
    warnings.push(
      `${env.PAYMENT_PROVIDER} Payment Provider 尚未在 Phase 1 实现。`,
    );
  }

  if (env.TRANSCODE_PROVIDER !== "none") {
    warnings.push(
      `${env.TRANSCODE_PROVIDER} Transcode Provider 尚未在 Phase 1 实现。`,
    );
  }

  if (env.OBSERVABILITY_PROVIDER !== "console") {
    warnings.push(
      `${env.OBSERVABILITY_PROVIDER} Observability Provider 尚未在 Phase 1 实现。`,
    );
  }

  return warnings;
}
