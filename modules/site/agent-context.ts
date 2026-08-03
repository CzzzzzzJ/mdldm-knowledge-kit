import type { PublicRuntimeConfig } from "@/config/env";
import type { SiteInitializationState } from "@/modules/site/initialization";

export const agentTaskIds = [
  "local-start",
  "serverless-deploy",
  "provider-config",
  "brand-customization",
  "article-publishing",
  "launch-acceptance",
] as const;

export type AgentTaskId = (typeof agentTaskIds)[number];

export const agentProviderKinds = [
  "storage",
  "email",
  "payment",
  "transcode",
  "observability",
] as const;

export type AgentProviderKind = (typeof agentProviderKinds)[number];

export interface AgentProviderReadinessInput {
  provider: string;
  status: "ready" | "limited" | "disabled";
  enabled: boolean;
  requiredEnv: string[];
}

export interface AgentContextReport {
  schemaVersion: "1";
  scope: "agent-context";
  status: "PASS" | "NEEDS_USER_ACTION" | "BLOCKED";
  generatedAt: string;
  project: {
    name: "mdldm-knowledge-kit";
    version: string;
  };
  lifecycle: {
    status: SiteInitializationState["status"] | "unknown";
    hasAdmin: boolean | null;
    completedSetupLessons: number | null;
    totalSetupLessons: number;
    source: SiteInitializationState["source"] | "unavailable";
  };
  runtime: {
    environment: PublicRuntimeConfig["environment"] | "unknown";
    providers: Record<AgentProviderKind, string | null>;
  };
  capabilities: Record<
    AgentProviderKind,
    {
      provider: string | null;
      status: AgentProviderReadinessInput["status"] | "unknown";
      enabled: boolean | null;
      requiredEnv: string[];
    }
  >;
  verification: {
    lifecycle: "database_or_inferred" | "unavailable";
    providers: "selected_configuration_only";
    externalL2L3: "not_claimed";
  };
  agent: {
    recommendedTask: AgentTaskId;
    taskGuide: "AGENT_TASKS.md";
    humanActionRequired: string;
    qualityCommands: string[];
    externalApprovalRequired: string[];
  };
}

function recommendedTaskForLifecycle(
  status: AgentContextReport["lifecycle"]["status"],
): AgentTaskId {
  if (status === "uninitialized") {
    return "local-start";
  }
  if (status === "live") {
    return "launch-acceptance";
  }
  return "provider-config";
}

function humanActionForLifecycle(
  status: AgentContextReport["lifecycle"]["status"],
): string {
  if (status === "unknown") {
    return "先修复配置或数据库连接，再判断站点生命周期；不要猜测站点已经上线。";
  }
  if (status === "uninitialized") {
    return "由站长在 /admin 两次确认自己的邮箱并自行保存一次性临时凭据。";
  }
  if (status === "configuring") {
    return "由站长在 /admin/setup 确认外部账号、运营设置和正式开站动作。";
  }
  return "任何 Production 发布、真实支付、邮件、对象写入或外部提交仍需站长确认。";
}

function fixedAgentPolicy() {
  return {
    taskGuide: "AGENT_TASKS.md" as const,
    qualityCommands: [
      "pnpm check-config",
      "pnpm check",
      "pnpm test:e2e",
      "pnpm release:audit",
    ],
    externalApprovalRequired: [
      "第三方登录或资源创建",
      "产生费用或发送真实邮件",
      "远端数据写入、删除或迁移",
      "Production 部署、域名或 DNS 变更",
      "Git push、Issue、PR、Release 或其他外部发布",
    ],
  };
}

export function createAgentContextReport(input: {
  version: string;
  runtime: PublicRuntimeConfig;
  lifecycle: SiteInitializationState;
  totalSetupLessons: number;
  providers: Record<AgentProviderKind, AgentProviderReadinessInput>;
  now?: Date;
}): AgentContextReport {
  const capabilities = Object.fromEntries(
    agentProviderKinds.map((kind) => {
      const readiness = input.providers[kind];
      return [
        kind,
        {
          provider: readiness.provider,
          status: readiness.status,
          enabled: readiness.enabled,
          requiredEnv: [...readiness.requiredEnv],
        },
      ];
    }),
  ) as AgentContextReport["capabilities"];
  const recommendedTask = recommendedTaskForLifecycle(
    input.lifecycle.status,
  );

  return {
    schemaVersion: "1",
    scope: "agent-context",
    status:
      input.lifecycle.status === "live" ? "PASS" : "NEEDS_USER_ACTION",
    generatedAt: (input.now ?? new Date()).toISOString(),
    project: {
      name: "mdldm-knowledge-kit",
      version: input.version,
    },
    lifecycle: {
      status: input.lifecycle.status,
      hasAdmin: input.lifecycle.hasAdmin,
      completedSetupLessons: input.lifecycle.completedLessons.length,
      totalSetupLessons: input.totalSetupLessons,
      source: input.lifecycle.source,
    },
    runtime: {
      environment: input.runtime.environment,
      providers: Object.fromEntries(
        agentProviderKinds.map((kind) => [
          kind,
          input.runtime.providers[kind],
        ]),
      ) as AgentContextReport["runtime"]["providers"],
    },
    capabilities,
    verification: {
      lifecycle: "database_or_inferred",
      providers: "selected_configuration_only",
      externalL2L3: "not_claimed",
    },
    agent: {
      ...fixedAgentPolicy(),
      recommendedTask,
      humanActionRequired: humanActionForLifecycle(input.lifecycle.status),
    },
  };
}

export function createUnavailableAgentContextReport(input: {
  version: string;
  totalSetupLessons: number;
  now?: Date;
}): AgentContextReport {
  const unknownProviders: AgentContextReport["runtime"]["providers"] = {
    storage: null,
    email: null,
    payment: null,
    transcode: null,
    observability: null,
  };
  const unknownCapability = {
    provider: null,
    status: "unknown" as const,
    enabled: null,
    requiredEnv: [],
  };
  const unknownCapabilities: AgentContextReport["capabilities"] = {
    storage: { ...unknownCapability },
    email: { ...unknownCapability },
    payment: { ...unknownCapability },
    transcode: { ...unknownCapability },
    observability: { ...unknownCapability },
  };

  return {
    schemaVersion: "1",
    scope: "agent-context",
    status: "BLOCKED",
    generatedAt: (input.now ?? new Date()).toISOString(),
    project: {
      name: "mdldm-knowledge-kit",
      version: input.version,
    },
    lifecycle: {
      status: "unknown",
      hasAdmin: null,
      completedSetupLessons: null,
      totalSetupLessons: input.totalSetupLessons,
      source: "unavailable",
    },
    runtime: {
      environment: "unknown",
      providers: unknownProviders,
    },
    capabilities: unknownCapabilities,
    verification: {
      lifecycle: "unavailable",
      providers: "selected_configuration_only",
      externalL2L3: "not_claimed",
    },
    agent: {
      ...fixedAgentPolicy(),
      recommendedTask: "provider-config",
      humanActionRequired: humanActionForLifecycle("unknown"),
    },
  };
}

function safeIdentifier(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const normalized = value
    .replace(/[^a-zA-Z0-9._:/-]+/g, "_")
    .slice(0, 100);
  return normalized || fallback;
}

export function createAgentDiagnosticPrompt(
  report: AgentContextReport,
): string {
  const providers = agentProviderKinds
    .map((kind) => `${kind}=${report.runtime.providers[kind] ?? "unknown"}`)
    .join(", ");

  return `请在当前 mdldm-knowledge-kit 仓库中处理站长后台的系统诊断任务。

先遵守 AGENTS.md，并阅读 AGENT_TASKS.md 中的公共安全契约。先运行 pnpm agent:status 获取当前脱敏事实，不要读取或输出 .env.local、Vercel 变量值、数据库 URI、Token、邮箱、Bucket、域名或业务数据。

当前后台脱敏快照：
- lifecycle=${report.lifecycle.status}
- setup=${report.lifecycle.completedSetupLessons ?? "unknown"}/${report.lifecycle.totalSetupLessons}
- environment=${report.runtime.environment}
- providers=${providers}
- recommendedTask=${report.agent.recommendedTask}

先做只读定位并给出证据。任何第三方登录、资源创建、真实写入、付费、发信、Production 发布、Git push 或 Issue 提交都必须先说明影响并等待我确认。完成修改后运行与改动相称的测试，至少包含 pnpm check，并报告回滚点。`;
}

export function createOperationalFailureAgentPrompt(input: {
  category: string;
  code: string;
  provider: string | null;
  occurrenceCount: number;
}): string {
  const category = safeIdentifier(input.category, "unknown");
  const code = safeIdentifier(input.code, "UNKNOWN_FAILURE");
  const provider = safeIdentifier(input.provider, "internal");
  const occurrenceCount = Math.max(1, Math.floor(input.occurrenceCount));

  return `请在当前 mdldm-knowledge-kit 仓库中诊断一个后台故障。

故障脱敏标识：category=${category}, code=${code}, provider=${provider}, occurrences=${occurrenceCount}。

先遵守 AGENTS.md，阅读 AGENT_TASKS.md，并运行 pnpm agent:status。不要让我粘贴后台详情、源 ID、用户信息或环境变量值；不要读取或输出 .env.local、URI、Token、邮箱、Bucket、域名和支付回调原文。先用代码、测试和脱敏状态做只读定位。

如果需要外部平台登录、远端写入、真实付费/发信、Production 部署、Git push 或 Issue 提交，先说明影响并等待确认。修复后运行相关单测和 pnpm check；涉及认证、权益、支付或主旅程时再运行 pnpm test:e2e，并给出回滚点。`;
}
