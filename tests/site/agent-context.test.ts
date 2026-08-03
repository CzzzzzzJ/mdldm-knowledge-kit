import { describe, expect, it } from "vitest";

import type { PublicRuntimeConfig } from "@/config/env";
import {
  createAgentContextReport,
  createAgentDiagnosticPrompt,
  createOperationalFailureAgentPrompt,
  createUnavailableAgentContextReport,
  type AgentProviderReadinessInput,
} from "@/modules/site/agent-context";

const runtime: PublicRuntimeConfig = {
  appName: "Private Creator Name",
  appUrl: "https://private-course.example.com",
  environment: "production",
  providers: {
    storage: "oss",
    email: "smtp",
    payment: "manual",
    transcode: "none",
    observability: "console",
  },
};

const providers: Record<
  keyof PublicRuntimeConfig["providers"],
  AgentProviderReadinessInput
> = {
  storage: {
    provider: "oss",
    status: "ready",
    enabled: true,
    requiredEnv: ["OSS_BUCKET", "OSS_ACCESS_KEY_SECRET"],
  },
  email: {
    provider: "smtp",
    status: "ready",
    enabled: true,
    requiredEnv: ["SMTP_HOST", "SMTP_PASSWORD"],
  },
  payment: {
    provider: "manual",
    status: "ready",
    enabled: true,
    requiredEnv: [],
  },
  transcode: {
    provider: "none",
    status: "disabled",
    enabled: false,
    requiredEnv: [],
  },
  observability: {
    provider: "console",
    status: "limited",
    enabled: true,
    requiredEnv: ["OBSERVABILITY_WEBHOOK_SECRET"],
  },
};

describe("Agent-first context", () => {
  it("reports lifecycle and provider names without public or secret identifiers", () => {
    const report = createAgentContextReport({
      version: "0.1.0",
      runtime,
      lifecycle: {
        status: "configuring",
        hasAdmin: true,
        completedLessons: ["welcome", "deploy"],
        launchedAt: null,
        source: "database",
      },
      totalSetupLessons: 8,
      providers,
      now: new Date("2026-08-03T08:00:00.000Z"),
    });
    const serialized = JSON.stringify(report);

    expect(report).toMatchObject({
      status: "NEEDS_USER_ACTION",
      lifecycle: {
        status: "configuring",
        hasAdmin: true,
        completedSetupLessons: 2,
        totalSetupLessons: 8,
      },
      runtime: {
        environment: "production",
        providers: {
          storage: "oss",
          email: "smtp",
          payment: "manual",
        },
      },
      verification: {
        lifecycle: "database_or_inferred",
        providers: "selected_configuration_only",
        externalL2L3: "not_claimed",
      },
      agent: { recommendedTask: "provider-config" },
    });
    expect(serialized).not.toContain(runtime.appName);
    expect(serialized).not.toContain(runtime.appUrl);
    expect(serialized).not.toContain("private-course.example.com");
    expect(serialized).toContain("OSS_ACCESS_KEY_SECRET");
    expect(serialized).not.toContain("replace-with");
  });

  it("blocks lifecycle claims when configuration or database state is unavailable", () => {
    const report = createUnavailableAgentContextReport({
      version: "0.1.0",
      totalSetupLessons: 8,
      now: new Date("2026-08-03T08:00:00.000Z"),
    });

    expect(report.status).toBe("BLOCKED");
    expect(report.lifecycle.status).toBe("unknown");
    expect(report.verification.lifecycle).toBe("unavailable");
    expect(report.agent.recommendedTask).toBe("provider-config");
    expect(Object.values(report.runtime.providers)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("creates bounded diagnostic prompts without backend details or source ids", () => {
    const report = createAgentContextReport({
      version: "0.1.0",
      runtime,
      lifecycle: {
        status: "live",
        hasAdmin: true,
        completedLessons: [],
        launchedAt: new Date("2026-08-03T08:00:00.000Z"),
        source: "database",
      },
      totalSetupLessons: 8,
      providers,
    });
    const generalPrompt = createAgentDiagnosticPrompt(report);
    const failurePrompt = createOperationalFailureAgentPrompt({
      category: "storage",
      code: "OSS_UPLOAD_FAILED",
      provider: "oss",
      occurrenceCount: 3,
    });

    expect(generalPrompt).toContain("pnpm agent:status");
    expect(generalPrompt).toContain("lifecycle=live");
    expect(generalPrompt).not.toContain(runtime.appName);
    expect(generalPrompt).not.toContain(runtime.appUrl);
    expect(failurePrompt).toContain(
      "category=storage, code=OSS_UPLOAD_FAILED, provider=oss, occurrences=3",
    );
    expect(failurePrompt).toContain("不要让我粘贴后台详情、源 ID、用户信息");
    expect(failurePrompt).not.toContain("sourceId");
  });
});
