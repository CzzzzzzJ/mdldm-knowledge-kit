import type { PublicRuntimeConfig } from "@/config/env";

export type ProviderCapabilityStatus = "ready" | "limited" | "disabled";

export interface ProviderReadiness {
  provider: string;
  status: ProviderCapabilityStatus;
  enabled: boolean;
  external: boolean;
  label: string;
  detail: string;
  action: string;
  requiredEnv: string[];
}

export type ProviderReadinessMap = Record<
  keyof PublicRuntimeConfig["providers"],
  ProviderReadiness
>;

export function getProviderReadiness(
  runtime: PublicRuntimeConfig,
): ProviderReadinessMap {
  const isProduction = runtime.environment === "production";

  return {
    storage:
      runtime.providers.storage === "oss"
        ? {
            provider: "oss",
            status: "ready",
            enabled: true,
            external: true,
            label: "视频与资料存储",
            detail: "OSS 已启用，可用于 Serverless 环境的私有媒体直传与授权读取。",
            action: "运行 pnpm validate:providers --live 验证 Bucket 连接与权限。",
            requiredEnv: [
              "STORAGE_PROVIDER",
              "OSS_REGION",
              "OSS_BUCKET",
              "OSS_ACCESS_KEY_ID",
              "OSS_ACCESS_KEY_SECRET",
            ],
          }
        : {
            provider: "local",
            status: "limited",
            enabled: true,
            external: false,
            label: "视频与资料存储",
            detail: isProduction
              ? "Local Storage 仅适合同一台有持久磁盘的服务器；不启用媒体的核心站点可继续运行，Serverless 视频与资料不持久。"
              : "Local Storage 可用于本地开发；不启用视频和资料时无需配置 OSS。",
            action: "需要在 Serverless 发布视频或资料时再选择 oss，并补齐 OSS 变量。",
            requiredEnv: [
              "STORAGE_PROVIDER",
              "OSS_REGION",
              "OSS_BUCKET",
              "OSS_ACCESS_KEY_ID",
              "OSS_ACCESS_KEY_SECRET",
            ],
          },
    email:
      runtime.providers.email === "smtp"
        ? {
            provider: "smtp",
            status: "ready",
            enabled: true,
            external: true,
            label: "账号邮件",
            detail: "SMTP 已启用，用户可以接收验证邮箱和找回密码邮件。",
            action: "运行 pnpm validate:providers --live 验证 SMTP 连接与认证。",
            requiredEnv: [
              "EMAIL_PROVIDER",
              "EMAIL_FROM",
              "SMTP_HOST",
              "SMTP_USER",
              "SMTP_PASSWORD",
            ],
          }
        : {
            provider: "console",
            status: isProduction ? "disabled" : "limited",
            enabled: !isProduction,
            external: false,
            label: "账号邮件",
            detail: isProduction
              ? "真实邮件未启用，自助注册、重发验证和找回密码已停用；已有账号仍可登录。"
              : "验证与重置链接只写入本地服务端日志，不会发送真实邮件。",
            action: "需要开放自助账号流程时选择 smtp，并补齐 SMTP 变量。",
            requiredEnv: [
              "EMAIL_PROVIDER",
              "EMAIL_FROM",
              "SMTP_HOST",
              "SMTP_USER",
              "SMTP_PASSWORD",
            ],
          },
    payment:
      runtime.providers.payment === "xorpay"
        ? {
            provider: "xorpay",
            status: "ready",
            enabled: true,
            external: true,
            label: "自动支付",
            detail: "XorPay 已启用，支付结果仍由服务端回调、订单和权益流程确认。",
            action: "在隔离商户环境完成低价真实订单与幂等回调验收。",
            requiredEnv: [
              "PAYMENT_PROVIDER",
              "XORPAY_AID",
              "XORPAY_APP_SECRET",
            ],
          }
        : runtime.providers.payment === "mock"
          ? {
              provider: "mock",
              status: "limited",
              enabled: true,
              external: false,
              label: "支付与发放权益",
              detail: "Mock Payment 仅用于测试，不会产生真实扣款，生产环境会拒绝启动。",
              action: "本地验收后改为 manual，或按需启用 xorpay。",
              requiredEnv: ["PAYMENT_PROVIDER"],
            }
          : {
              provider: "manual",
              status: "ready",
              enabled: true,
              external: false,
              label: "支付与发放权益",
              detail: "Manual Payment 已启用，不依赖自动支付平台，由管理员核对后确认订单。",
              action: "如需自动收款，再选择 xorpay 并补齐 XorPay 变量。",
              requiredEnv: [],
            },
    transcode: {
      provider: "none",
      status: "disabled",
      enabled: false,
      external: false,
      label: "视频转码",
      detail: "开源第一版不提供转码 Provider；上传前请准备可直接播放的媒体文件。",
      action: "复杂转码、队列与 MPS 接入保留在扩展实践路线中。",
      requiredEnv: [],
    },
    observability:
      runtime.providers.observability === "webhook"
        ? {
            provider: "webhook",
            status: "ready",
            enabled: true,
            external: true,
            label: "外部故障通知",
            detail: "签名 Webhook 已启用，主要故障可发送到外部接收端。",
            action: "在隔离接收端完成签名、重放保护和告警内容验收。",
            requiredEnv: [
              "OBSERVABILITY_PROVIDER",
              "OBSERVABILITY_WEBHOOK_URL",
              "OBSERVABILITY_WEBHOOK_SECRET",
            ],
          }
        : {
            provider: "console",
            status: "limited",
            enabled: true,
            external: false,
            label: "外部故障通知",
            detail: "结构化日志和后台失败队列可用，但不会主动发送外部告警。",
            action: "需要外部通知时选择 webhook，并补齐 Webhook 变量。",
            requiredEnv: [
              "OBSERVABILITY_PROVIDER",
              "OBSERVABILITY_WEBHOOK_URL",
              "OBSERVABILITY_WEBHOOK_SECRET",
            ],
          },
  };
}
