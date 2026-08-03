import type { PublicRuntimeConfig } from "@/config/env";

export type ServerlessReadinessStatus =
  | "PASS"
  | "NEEDS_USER_ACTION"
  | "BLOCKED";

export interface ServerlessRepositoryContract {
  packageManager: string | null;
  installCommand: string | null;
  buildCommand: string | null;
  regions: string[];
  dockerScope: string | null;
}

export interface ServerlessProbeResult {
  requested: boolean;
  shallow: "pass" | "fail" | "not_run";
  deep: "pass" | "fail" | "not_run";
}

export interface ServerlessReadinessInput {
  runtime: PublicRuntimeConfig;
  authSecretConfigured: boolean;
  initialSetupTokenConfigured: boolean;
  configWarnings: string[];
  repository: ServerlessRepositoryContract;
  probe: ServerlessProbeResult;
}

export interface ServerlessReadinessReport {
  status: ServerlessReadinessStatus;
  scope: "technical-readiness";
  officialPath: "agent-vercel-serverless";
  repositoryChecks: Array<{
    id: string;
    status: "pass" | "fail";
    detail: string;
  }>;
  runtime: {
    environment: PublicRuntimeConfig["environment"];
    providers: PublicRuntimeConfig["providers"];
    operationalProfile: "ready" | "limited";
  };
  deploymentProbe: ServerlessProbeResult;
  warnings: string[];
  manualActions: string[];
  verification: {
    repository: "checked";
    remoteHealth: "checked" | "not_checked";
    isolatedProviderL2L3: "manual_evidence_required";
    mainlandNetwork: "manual_evidence_required";
  };
}

const OFFICIAL_PACKAGE_MANAGER = "pnpm@10.14.0";
const OFFICIAL_INSTALL_COMMAND = "pnpm install --frozen-lockfile";
const OFFICIAL_BUILD_COMMAND = "pnpm build";
const OFFICIAL_REGION = "hkg1";
const LOCAL_DOCKER_SCOPE = "local-mongodb-only";

export function validateServerlessProbeUrl(value: string): URL {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("部署探测地址必须使用 HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("部署探测地址不得包含用户名或密码");
  }
  if (url.search || url.hash) {
    throw new Error("部署探测地址不得包含查询参数或片段");
  }
  if (url.pathname !== "/") {
    throw new Error("部署探测地址只接受站点根地址");
  }

  return url;
}

export function assessServerlessReadiness(
  input: ServerlessReadinessInput,
): ServerlessReadinessReport {
  const repositoryChecks = [
    {
      id: "package-manager",
      status:
        input.repository.packageManager === OFFICIAL_PACKAGE_MANAGER
          ? ("pass" as const)
          : ("fail" as const),
      detail: `packageManager 必须固定为 ${OFFICIAL_PACKAGE_MANAGER}`,
    },
    {
      id: "vercel-install",
      status:
        input.repository.installCommand === OFFICIAL_INSTALL_COMMAND
          ? ("pass" as const)
          : ("fail" as const),
      detail: `Vercel 必须使用 ${OFFICIAL_INSTALL_COMMAND}`,
    },
    {
      id: "vercel-build",
      status:
        input.repository.buildCommand === OFFICIAL_BUILD_COMMAND
          ? ("pass" as const)
          : ("fail" as const),
      detail: `Vercel 必须使用 ${OFFICIAL_BUILD_COMMAND}`,
    },
    {
      id: "vercel-region",
      status: input.repository.regions.includes(OFFICIAL_REGION)
        ? ("pass" as const)
        : ("fail" as const),
      detail: `国内用户优先的默认函数区域必须包含 ${OFFICIAL_REGION}`,
    },
    {
      id: "docker-scope",
      status:
        input.repository.dockerScope === LOCAL_DOCKER_SCOPE
          ? ("pass" as const)
          : ("fail" as const),
      detail: "Docker Compose 必须明确限定为本地 MongoDB 辅助",
    },
  ];

  const operationalProfile =
    input.runtime.providers.storage === "oss" &&
    input.runtime.providers.email === "smtp" &&
    input.runtime.providers.payment !== "mock"
      ? "ready"
      : "limited";

  const manualActions: string[] = [];

  if (input.runtime.environment !== "production") {
    manualActions.push("在隔离的 Preview / Production 环境中重新运行检查");
  }
  if (!input.authSecretConfigured) {
    manualActions.push("配置至少 32 位的生产 AUTH_SECRET");
  }
  if (!input.initialSetupTokenConfigured) {
    manualActions.push(
      "首个管理员尚未创建时配置一次性 INITIAL_SETUP_TOKEN",
    );
  }
  if (operationalProfile === "limited") {
    manualActions.push(
      "当前视频优先版本公开运营前启用 OSS 与 SMTP；自动支付可继续使用 Manual",
    );
  }
  if (!input.probe.requested) {
    manualActions.push("提供 Preview HTTPS 根地址，执行只读浅层与深度健康检查");
  } else if (
    input.probe.shallow !== "pass" ||
    input.probe.deep !== "pass"
  ) {
    manualActions.push("修复 Preview 的浅层或深度健康检查失败项");
  }

  manualActions.push(
    "使用全新隔离第三方账号保存 L2/L3 验收证据，任何写入、付费或生产发布前由用户确认",
    "使用自定义域名从至少两个中国大陆网络点实测首页、登录、后台与学习页",
  );

  const blocked = repositoryChecks.some((item) => item.status === "fail");
  const technicalReady =
    input.runtime.environment === "production" &&
    input.authSecretConfigured &&
    operationalProfile === "ready" &&
    input.probe.requested &&
    input.probe.shallow === "pass" &&
    input.probe.deep === "pass";

  return {
    status: blocked
      ? "BLOCKED"
      : technicalReady
        ? "PASS"
        : "NEEDS_USER_ACTION",
    scope: "technical-readiness",
    officialPath: "agent-vercel-serverless",
    repositoryChecks,
    runtime: {
      environment: input.runtime.environment,
      providers: input.runtime.providers,
      operationalProfile,
    },
    deploymentProbe: input.probe,
    warnings: input.configWarnings,
    manualActions,
    verification: {
      repository: "checked",
      remoteHealth: input.probe.requested ? "checked" : "not_checked",
      isolatedProviderL2L3: "manual_evidence_required",
      mainlandNetwork: "manual_evidence_required",
    },
  };
}
