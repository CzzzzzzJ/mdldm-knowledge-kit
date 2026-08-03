import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import {
  getAgentContextReport,
  getUnavailableAgentContextReport,
} from "@/app/lib/agent-context-service";
import packageMetadata from "@/package.json";
import {
  createDoctorReport,
  renderAgentIssueDraft,
  scanDoctorArtifact,
  type DoctorReport,
} from "@/modules/operations/doctor";

const repositoryRoot = process.cwd();
const requiredRepositoryFiles = [
  "AGENTS.md",
  "PROJECT.md",
  "ARCHITECTURE.md",
  "TASKS.md",
  "README.md",
  "START_HERE.md",
  "AGENT_QUICKSTART.md",
  "AGENT_SERVERLESS_DEPLOY.md",
  "AGENT_TASKS.md",
  "pnpm-lock.yaml",
] as const;
const foreignLockfiles = [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
] as const;

function getWorktreeState(): "clean" | "dirty" | "unknown" {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 5_000,
  });

  if (result.status !== 0 || result.error) {
    return "unknown";
  }
  return result.stdout.trim() ? "dirty" : "clean";
}

async function buildReport(): Promise<DoctorReport> {
  let agentContext;
  try {
    agentContext = await getAgentContextReport();
  } catch {
    agentContext = getUnavailableAgentContextReport();
  }

  return createDoctorReport({
    agentContext,
    nodeVersion: process.version,
    packageManager: packageMetadata.packageManager,
    repository: {
      requiredFilesPresent: requiredRepositoryFiles.every((file) =>
        existsSync(path.join(repositoryRoot, file)),
      ),
      pnpmLockPresent: existsSync(
        path.join(repositoryRoot, "pnpm-lock.yaml"),
      ),
      foreignLockfilesPresent: foreignLockfiles.some((file) =>
        existsSync(path.join(repositoryRoot, file)),
      ),
      worktree: getWorktreeState(),
    },
  });
}

function assertPrivacyScan(value: string): void {
  const findings = scanDoctorArtifact(value);
  if (findings.length === 0) {
    return;
  }

  console.error("Doctor privacy scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}`);
  }
  throw new Error("DOCTOR_PRIVACY_SCAN_FAILED");
}

function issueDraftFilename(now = new Date()): string {
  const timestamp = now.toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  return `agent-report-${timestamp}.md`;
}

async function writeIssueDraft(report: DoctorReport): Promise<string> {
  const draft = renderAgentIssueDraft(report);
  assertPrivacyScan(draft);

  const relativeDirectory = ".mdldm";
  const relativePath = path.posix.join(
    relativeDirectory,
    issueDraftFilename(),
  );
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  await mkdir(absoluteDirectory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(repositoryRoot, relativePath), draft, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return relativePath;
}

function printUsage(): void {
  console.log("Usage: pnpm run doctor [--issue]");
  console.log("--issue  只在本地生成脱敏 Issue 草稿，不提交到 GitHub。");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    printUsage();
    return;
  }
  if (args.some((arg) => arg !== "--issue") || args.length > 1) {
    printUsage();
    process.exitCode = 2;
    return;
  }

  loadEnvConfig(repositoryRoot);
  const report = await buildReport();
  assertPrivacyScan(JSON.stringify(report));

  if (args.includes("--issue")) {
    const draftPath = await writeIssueDraft(report);
    console.log(
      JSON.stringify(
        {
          status: report.status,
          privacyScan: "PASS",
          draft: draftPath,
          externalSubmission: "NOT_PERFORMED",
          humanAction:
            "请人工检查草稿，再自行决定是否提交到 Agent Report Issue；安全漏洞必须走私密 Advisory。",
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      JSON.stringify(
        {
          privacyScan: "PASS",
          report,
        },
        null,
        2,
      ),
    );
  }

  if (report.status === "BLOCKED") {
    process.exitCode = 1;
  }
}

void main()
  .catch((error) => {
    if (!(error instanceof Error) || error.message !== "DOCTOR_PRIVACY_SCAN_FAILED") {
      console.error("Doctor failed without exposing the underlying error.");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
