import { describe, expect, it } from "vitest";

import type { PublicRuntimeConfig } from "@/config/env";
import {
  createDoctorReport,
  renderAgentIssueDraft,
  scanDoctorArtifact,
} from "@/modules/operations/doctor";
import {
  createAgentContextReport,
  type AgentProviderReadinessInput,
} from "@/modules/site/agent-context";

const runtime: PublicRuntimeConfig = {
  appName: "creator@example.invalid",
  appUrl: "https://private.example.invalid",
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
    requiredEnv: ["STORAGE_PROVIDER", "OSS_BUCKET", "OSS_ACCESS_KEY_SECRET"],
  },
  email: {
    provider: "smtp",
    status: "ready",
    enabled: true,
    requiredEnv: ["EMAIL_PROVIDER", "SMTP_HOST", "SMTP_PASSWORD"],
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
    requiredEnv: ["OBSERVABILITY_PROVIDER"],
  },
};

function buildDoctorReport(worktree: "clean" | "dirty" = "clean") {
  const agentContext = createAgentContextReport({
    version: "0.1.0",
    runtime,
    lifecycle: {
      status: "live",
      hasAdmin: true,
      completedLessons: ["welcome", "deploy"],
      launchedAt: new Date("2026-08-03T08:00:00.000Z"),
      source: "database",
    },
    totalSetupLessons: 8,
    providers,
    now: new Date("2026-08-03T08:00:00.000Z"),
  });

  return createDoctorReport({
    agentContext,
    nodeVersion: "v22.18.0",
    packageManager: "pnpm@10.14.0",
    repository: {
      requiredFilesPresent: true,
      pnpmLockPresent: true,
      foreignLockfilesPresent: false,
      worktree,
    },
    now: new Date("2026-08-03T08:01:00.000Z"),
  });
}

describe("Agent Doctor", () => {
  it("reports versions, capabilities, providers and checks without private runtime values", () => {
    const report = buildDoctorReport();
    const serialized = JSON.stringify(report);

    expect(report).toMatchObject({
      status: "PASS",
      project: { version: "0.1.0" },
      toolchain: {
        node: "v22.18.0",
        packageManager: "pnpm@10.14.0",
      },
      capabilities: {
        storage: { provider: "oss", status: "ready" },
        email: { provider: "smtp", status: "ready" },
        payment: { provider: "manual", status: "ready" },
      },
      nextAction: {
        humanReviewRequired: true,
        externalSubmission: "not_performed",
      },
    });
    expect(report.checks).toHaveLength(6);
    expect(scanDoctorArtifact(serialized)).toEqual([]);
    expect(serialized).not.toContain(runtime.appName);
    expect(serialized).not.toContain(runtime.appUrl);
  });

  it("marks a dirty worktree as needing human action without listing changed files", () => {
    const report = buildDoctorReport("dirty");
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("NEEDS_USER_ACTION");
    expect(report.checks).toContainEqual(
      expect.objectContaining({
        id: "working-tree",
        status: "NEEDS_USER_ACTION",
        code: "WORKTREE_DIRTY",
      }),
    );
    expect(serialized).not.toContain("doctor.test.ts");
  });

  it("detects paths, email, URI, secrets, Bucket values and possible record ids", () => {
    const absoluteUserPath = ["", "Users", "private", "work", "project"].join(
      "/",
    );
    const privateEmail = ["creator", "private.example"].join("@");
    const findings = scanDoctorArtifact(`
      ${absoluteUserPath}
      ${privateEmail}
      https://private.example.com/path
      token=do-not-share
      OSS_BUCKET=private-bucket
      record=507f1f77bcf86cd799439011
    `);

    expect(findings.map((finding) => finding.code)).toEqual([
      "ABSOLUTE_USER_PATH",
      "EMAIL_ADDRESS",
      "URI_OR_DOMAIN",
      "SECRET_ASSIGNMENT",
      "BUCKET_ASSIGNMENT",
      "POSSIBLE_RECORD_ID",
    ]);
  });

  it("renders a local-only Issue draft with an explicit human confirmation gate", () => {
    const draft = renderAgentIssueDraft(buildDoctorReport());

    expect(draft).toContain("pnpm run doctor --issue");
    expect(draft).toContain("没有创建 Issue");
    expect(draft).toContain("externalSubmission");
    expect(draft).toContain("由我本人决定是否复制到 Agent Report Issue");
    expect(draft).toContain("Private Security Advisory");
    expect(scanDoctorArtifact(draft)).toEqual([]);
  });
});
