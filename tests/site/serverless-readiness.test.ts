import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { PublicRuntimeConfig } from "@/config/env";
import {
  assessServerlessReadiness,
  type ServerlessReadinessInput,
  validateServerlessProbeUrl,
} from "@/modules/site/serverless-readiness";

function runtime(
  environment: PublicRuntimeConfig["environment"] = "production",
): PublicRuntimeConfig {
  return {
    appName: "Knowledge Kit Test",
    appUrl: "https://knowledge.example.com",
    environment,
    providers: {
      storage: "oss",
      email: "smtp",
      payment: "manual",
      transcode: "none",
      observability: "console",
    },
  };
}

function readyInput(): ServerlessReadinessInput {
  return {
    runtime: runtime(),
    authSecretConfigured: true,
    initialSetupTokenConfigured: true,
    configWarnings: [],
    repository: {
      packageManager: "pnpm@10.14.0",
      installCommand: "pnpm install --frozen-lockfile",
      buildCommand: "pnpm build",
      regions: ["hkg1"],
      dockerScope: "local-mongodb-only",
    },
    probe: {
      requested: true,
      shallow: "pass" as const,
      deep: "pass" as const,
    },
  };
}

describe("Agent + Serverless readiness", () => {
  it("passes the technical contract without claiming external L2/L3 evidence", () => {
    const report = assessServerlessReadiness(readyInput());

    expect(report.status).toBe("PASS");
    expect(report.officialPath).toBe("agent-vercel-serverless");
    expect(report.verification).toEqual({
      repository: "checked",
      remoteHealth: "checked",
      isolatedProviderL2L3: "manual_evidence_required",
      mainlandNetwork: "manual_evidence_required",
    });
    expect(JSON.stringify(report)).not.toMatch(
      /mongodb\+srv|accesskey|smtp_password|token=/i,
    );
  });

  it("requires user action for a local or incomplete operating profile", () => {
    const input = readyInput();
    input.runtime = {
      ...runtime("development"),
      providers: {
        ...runtime("development").providers,
        storage: "local",
        email: "console",
      },
    };
    input.probe = {
      requested: false,
      shallow: "not_run",
      deep: "not_run",
    };

    const report = assessServerlessReadiness(input);

    expect(report.status).toBe("NEEDS_USER_ACTION");
    expect(report.runtime.operationalProfile).toBe("limited");
    expect(report.manualActions.join("\n")).toContain("Preview HTTPS");
  });

  it("blocks repository drift from the maintained deployment contract", () => {
    const input = readyInput();
    input.repository.regions = ["iad1"];

    const report = assessServerlessReadiness(input);

    expect(report.status).toBe("BLOCKED");
    expect(report.repositoryChecks).toContainEqual(
      expect.objectContaining({ id: "vercel-region", status: "fail" }),
    );
  });

  it("accepts only a credential-free HTTPS root URL for read-only probes", () => {
    expect(validateServerlessProbeUrl("https://preview.example.com/").origin).toBe(
      "https://preview.example.com",
    );
    expect(() =>
      validateServerlessProbeUrl("http://preview.example.com/"),
    ).toThrow("HTTPS");
    expect(() =>
      validateServerlessProbeUrl("https://user:pass@127.0.0.1/"),
    ).toThrow("用户名或密码");
    expect(() =>
      validateServerlessProbeUrl("https://preview.example.com/admin"),
    ).toThrow("根地址");
  });

  it("keeps docs and deployment manifests aligned with the official path", async () => {
    const [agentGuide, packageJson, vercelJson, dockerCompose] =
      await Promise.all([
        readFile(path.join(process.cwd(), "AGENT_SERVERLESS_DEPLOY.md"), "utf8"),
        readFile(path.join(process.cwd(), "package.json"), "utf8"),
        readFile(path.join(process.cwd(), "vercel.json"), "utf8"),
        readFile(path.join(process.cwd(), "docker-compose.yml"), "utf8"),
      ]);

    expect(agentGuide).toContain("Preview 通过后才能申请 Production");
    expect(agentGuide).toContain("NEEDS_USER_ACTION");
    expect(agentGuide).toContain("至少两个中国大陆网络点");
    expect(agentGuide).toContain("不读取或回显环境变量值");
    expect(JSON.parse(packageJson).scripts["check:serverless"]).toBe(
      "tsx scripts/check-serverless-readiness.ts",
    );
    expect(JSON.parse(vercelJson).regions).toEqual(["hkg1"]);
    expect(dockerCompose).toContain("x-mdldm-scope: local-mongodb-only");
  });
});
