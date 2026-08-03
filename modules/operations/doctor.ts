import type {
  AgentContextReport,
  AgentProviderKind,
} from "@/modules/site/agent-context";

export const doctorCheckIds = [
  "node-runtime",
  "repository-files",
  "package-manager",
  "configuration",
  "site-lifecycle",
  "working-tree",
] as const;

export type DoctorCheckId = (typeof doctorCheckIds)[number];
export type DoctorStatus = "PASS" | "NEEDS_USER_ACTION" | "BLOCKED";

export interface DoctorCheck {
  id: DoctorCheckId;
  status: DoctorStatus;
  code: string;
  summary: string;
}

export interface DoctorReport {
  schemaVersion: "1";
  scope: "agent-doctor";
  status: DoctorStatus;
  generatedAt: string;
  project: {
    name: "mdldm-knowledge-kit";
    version: string;
  };
  toolchain: {
    node: string;
    packageManager: string;
  };
  lifecycle: AgentContextReport["lifecycle"];
  capabilities: AgentContextReport["capabilities"];
  verification: {
    providers: "selected_configuration_only";
    externalL2L3: "not_claimed";
    privacy: "local_scan_required_before_draft";
  };
  checks: DoctorCheck[];
  nextAction: {
    taskGuide: "AGENT_TASKS.md";
    recommendedTask: AgentContextReport["agent"]["recommendedTask"];
    humanReviewRequired: true;
    externalSubmission: "not_performed";
  };
}

export interface DoctorPrivacyFinding {
  code:
    | "ABSOLUTE_USER_PATH"
    | "EMAIL_ADDRESS"
    | "URI_OR_DOMAIN"
    | "SECRET_ASSIGNMENT"
    | "BUCKET_ASSIGNMENT"
    | "POSSIBLE_RECORD_ID";
  summary: string;
}

function safeIdentifier(value: string, fallback: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9._@-]+/g, "_").slice(0, 80);
  return normalized || fallback;
}

function safeRequiredEnv(values: string[]): string[] {
  return values.filter((value) => /^[A-Z][A-Z0-9_]{1,79}$/.test(value));
}

function copyCapabilities(
  capabilities: AgentContextReport["capabilities"],
): DoctorReport["capabilities"] {
  return Object.fromEntries(
    Object.entries(capabilities).map(([kind, capability]) => [
      kind,
      {
        provider: capability.provider
          ? safeIdentifier(capability.provider, "unknown")
          : null,
        status: capability.status,
        enabled: capability.enabled,
        requiredEnv: safeRequiredEnv(capability.requiredEnv),
      },
    ]),
  ) as Record<AgentProviderKind, DoctorReport["capabilities"][AgentProviderKind]>;
}

function createCheck(input: {
  id: DoctorCheckId;
  pass: boolean;
  passCode: string;
  failureCode: string;
  passSummary: string;
  failureSummary: string;
  failureStatus?: Exclude<DoctorStatus, "PASS">;
}): DoctorCheck {
  return input.pass
    ? {
        id: input.id,
        status: "PASS",
        code: input.passCode,
        summary: input.passSummary,
      }
    : {
        id: input.id,
        status: input.failureStatus ?? "BLOCKED",
        code: input.failureCode,
        summary: input.failureSummary,
      };
}

function parseNodeMajor(nodeVersion: string): number | null {
  const match = /^v?(\d+)/.exec(nodeVersion);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function aggregateStatus(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === "BLOCKED")) {
    return "BLOCKED";
  }
  if (checks.some((check) => check.status === "NEEDS_USER_ACTION")) {
    return "NEEDS_USER_ACTION";
  }
  return "PASS";
}

export function createDoctorReport(input: {
  agentContext: AgentContextReport;
  nodeVersion: string;
  packageManager: string;
  repository: {
    requiredFilesPresent: boolean;
    pnpmLockPresent: boolean;
    foreignLockfilesPresent: boolean;
    worktree: "clean" | "dirty" | "unknown";
  };
  now?: Date;
}): DoctorReport {
  const nodeMajor = parseNodeMajor(input.nodeVersion);
  const nodeSupported = nodeMajor !== null && nodeMajor >= 20;
  const packageManagerReady =
    input.packageManager === "pnpm@10.14.0" &&
    input.repository.pnpmLockPresent &&
    !input.repository.foreignLockfilesPresent;
  const configReadable = input.agentContext.runtime.environment !== "unknown";
  const lifecycleReadable = input.agentContext.lifecycle.status !== "unknown";
  const worktreeKnown = input.repository.worktree !== "unknown";

  const checks: DoctorCheck[] = [
    createCheck({
      id: "node-runtime",
      pass: nodeSupported,
      passCode: "NODE_SUPPORTED",
      failureCode: "NODE_UNSUPPORTED",
      passSummary: "Node.js 运行时满足最低版本要求。",
      failureSummary: "Node.js 运行时低于 20 或无法识别。",
    }),
    createCheck({
      id: "repository-files",
      pass: input.repository.requiredFilesPresent,
      passCode: "REPOSITORY_FILES_PRESENT",
      failureCode: "REPOSITORY_FILES_MISSING",
      passSummary: "Agent-first 启动所需仓库文件存在。",
      failureSummary: "Agent-first 启动所需仓库文件不完整。",
    }),
    createCheck({
      id: "package-manager",
      pass: packageManagerReady,
      passCode: "PNPM_CONTRACT_READY",
      failureCode: "PNPM_CONTRACT_INVALID",
      passSummary: "pnpm 版本契约与唯一锁文件有效。",
      failureSummary: "pnpm 版本契约或唯一锁文件不符合要求。",
    }),
    createCheck({
      id: "configuration",
      pass: configReadable,
      passCode: "CONFIGURATION_READABLE",
      failureCode: "CONFIGURATION_UNAVAILABLE",
      passSummary: "已选择配置可以生成脱敏能力状态。",
      failureSummary: "配置无法读取；Doctor 不会输出底层错误或变量值。",
    }),
    createCheck({
      id: "site-lifecycle",
      pass: lifecycleReadable,
      passCode: "SITE_LIFECYCLE_READABLE",
      failureCode: "SITE_LIFECYCLE_UNAVAILABLE",
      passSummary: "站点生命周期可以通过数据库或安全推断读取。",
      failureSummary: "站点生命周期不可用；不能据此判断已经上线。",
    }),
    createCheck({
      id: "working-tree",
      pass: input.repository.worktree === "clean",
      passCode: "WORKTREE_CLEAN",
      failureCode: worktreeKnown ? "WORKTREE_DIRTY" : "WORKTREE_UNKNOWN",
      passSummary: "Git 工作区干净，复现基线明确。",
      failureSummary: worktreeKnown
        ? "Git 工作区存在未提交改动；提交报告前请说明复现基线。"
        : "无法读取 Git 工作区状态；提交报告前请确认复现基线。",
      failureStatus: "NEEDS_USER_ACTION",
    }),
  ];

  return {
    schemaVersion: "1",
    scope: "agent-doctor",
    status: aggregateStatus(checks),
    generatedAt: (input.now ?? new Date()).toISOString(),
    project: {
      name: "mdldm-knowledge-kit",
      version: safeIdentifier(input.agentContext.project.version, "unknown"),
    },
    toolchain: {
      node: safeIdentifier(input.nodeVersion, "unknown"),
      packageManager: safeIdentifier(input.packageManager, "unknown"),
    },
    lifecycle: { ...input.agentContext.lifecycle },
    capabilities: copyCapabilities(input.agentContext.capabilities),
    verification: {
      providers: "selected_configuration_only",
      externalL2L3: "not_claimed",
      privacy: "local_scan_required_before_draft",
    },
    checks,
    nextAction: {
      taskGuide: "AGENT_TASKS.md",
      recommendedTask: input.agentContext.agent.recommendedTask,
      humanReviewRequired: true,
      externalSubmission: "not_performed",
    },
  };
}

const privacyPatterns: Array<{
  code: DoctorPrivacyFinding["code"];
  summary: string;
  pattern: RegExp;
}> = [
  {
    code: "ABSOLUTE_USER_PATH",
    summary: "报告包含本机用户绝对路径。",
    pattern: /(?:\/Users\/[^\s`"']+|[A-Z]:\\Users\\[^\s`"']+)/i,
  },
  {
    code: "EMAIL_ADDRESS",
    summary: "报告包含邮箱地址。",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    code: "URI_OR_DOMAIN",
    summary: "报告包含 URI 或可识别域名。",
    pattern:
      /(?:\b(?:mongodb(?:\+srv)?|https?|postgres(?:ql)?|redis|amqps?|s3):\/\/|\b(?:[a-z0-9-]+\.)+(?:com|cn|net|org|io|dev|app|cloud|xyz|top|site|online|tech)\b)/i,
  },
  {
    code: "SECRET_ASSIGNMENT",
    summary: "报告包含疑似凭据赋值。",
    pattern:
      /\b(?:authorization|cookie|password|passwd|secret|token|access[_-]?key(?:[_-]?(?:id|secret))?)\s*[:=]\s*["']?(?!\[redacted\]|unknown|null|not_set)[^\s"'|,;]+/i,
  },
  {
    code: "BUCKET_ASSIGNMENT",
    summary: "报告包含疑似 Bucket 实际值。",
    pattern:
      /\b(?:bucket|oss[_-]?bucket)\s*[:=]\s*["']?(?!\[redacted\]|unknown|null|not_set)[^\s"'|,;]+/i,
  },
  {
    code: "POSSIBLE_RECORD_ID",
    summary: "报告包含疑似数据库记录标识。",
    pattern: /\b[a-f0-9]{24}\b/i,
  },
];

export function scanDoctorArtifact(value: string): DoctorPrivacyFinding[] {
  return privacyPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ code, summary }) => ({ code, summary }));
}

export function renderAgentIssueDraft(report: DoctorReport): string {
  return `# Agent Report 草稿

> 由 \`pnpm run doctor --issue\` 在本地生成。命令没有登录 GitHub、没有创建 Issue，也没有执行任何外部提交。

## 人工填写

- 问题目标：<!-- 用一句话说明希望复现或修复什么 -->
- 最小复现步骤：<!-- 不要粘贴日志原文、环境变量值或真实业务数据 -->
- 期望结果：<!-- 说明可验证的完成条件 -->

## 脱敏 Doctor 报告

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`

## 提交前人工确认

- [ ] 我已检查草稿，不包含 URI、Token、邮箱、Bucket、域名、密钥或真实业务数据。
- [ ] 这不是安全漏洞；安全漏洞将改用 GitHub Private Security Advisory。
- [ ] 我理解本命令只生成草稿，并由我本人决定是否复制到 Agent Report Issue。
`;
}
