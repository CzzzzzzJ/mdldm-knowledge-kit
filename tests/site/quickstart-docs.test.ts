import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function readProjectFile(file: string) {
  return readFile(path.join(process.cwd(), file), "utf8");
}

describe("Agent-first quickstart contract", () => {
  it("keeps one executable 15-minute journey with actionable evidence", async () => {
    const startHere = await readProjectFile("START_HERE.md");

    expect(startHere).toContain("pnpm install --frozen-lockfile");
    expect(startHere).toContain("pnpm quickstart:prepare");
    expect(startHere).toContain("http://localhost:3000/admin");
    expect(startHere).toContain("http://localhost:3000/admin/setup");
    expect(startHere).toContain("/api/health?deep=1");
    expect(startHere).toContain("pnpm seed-demo");
    expect(startHere).toContain("不计入 15 分钟");
    expect(startHere.match(/意义：/g)?.length).toBeGreaterThanOrEqual(8);
    expect(startHere.match(/预期结果：/g)?.length).toBeGreaterThanOrEqual(7);
    expect(startHere.match(/失败处理：/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("gives the Agent a bounded protocol and redacted report format", async () => {
    const [agentQuickstart, agentTasks] = await Promise.all([
      readProjectFile("AGENT_QUICKSTART.md"),
      readProjectFile("AGENT_TASKS.md"),
    ]);
    const packageJson = JSON.parse(
      await readProjectFile("package.json"),
    ) as { scripts?: Record<string, string> };

    expect(agentQuickstart).toContain("不要读取 `.local-planning`");
    expect(agentQuickstart).toContain("不打印、复制、总结或回显 `.env.local` 的值");
    expect(agentQuickstart).toContain("状态：PASS | NEEDS_USER_ACTION | BLOCKED");
    expect(agentQuickstart).toContain("任何第三方登录、付费、资源创建和外部发布");
    expect(packageJson.scripts?.["quickstart:prepare"]).toBe(
      "tsx scripts/prepare-local-env.ts",
    );
    expect(packageJson.scripts?.["agent:status"]).toBe(
      "tsx scripts/agent-status.ts",
    );
    expect(packageJson.scripts?.doctor).toBe("tsx scripts/doctor.ts");
    for (const task of [
      "标准本地启动 Prompt",
      "Agent + Serverless 部署 Prompt",
      "Provider 配置 Prompt",
      "品牌改造 Prompt",
      "图文发布 Prompt",
      "上线验收 Prompt",
    ]) {
      expect(agentTasks).toContain(task);
    }
    expect(agentTasks).toContain("敏感信息禁区");
    expect(agentTasks).toContain("必须由用户确认的外部动作");
    expect(agentTasks).toContain("质量命令与回滚点");
    expect(agentTasks).toContain("当前 v0.1 基线可能");
    expect(agentTasks).toContain("返回 BLOCKED");
  });

  it("keeps Doctor drafts local and exposes human-reviewed feedback routes", async () => {
    const [
      readme,
      agentReport,
      exploreSubmission,
      issueConfig,
      gitignore,
      releaseAudit,
    ] = await Promise.all([
      readProjectFile("README.md"),
      readProjectFile(".github/ISSUE_TEMPLATE/03-agent-report.yml"),
      readProjectFile(".github/ISSUE_TEMPLATE/04-explore-submission.yml"),
      readProjectFile(".github/ISSUE_TEMPLATE/config.yml"),
      readProjectFile(".gitignore"),
      readProjectFile("scripts/release-audit.mjs"),
    ]);

    expect(readme).toContain("pnpm run doctor --issue");
    expect(readme).toContain("pnpm 10 自带同名内置命令");
    expect(readme).toContain("不会登录 GitHub，也不会创建或提交 Issue");
    for (const template of [
      "01-bug.yml",
      "02-feature.yml",
      "03-agent-report.yml",
      "04-explore-submission.yml",
    ]) {
      expect(readme).toContain(template);
    }
    expect(agentReport).toContain("pnpm run doctor --issue");
    expect(agentReport).toContain("本次公开 Issue 是我本人确认后的操作");
    expect(agentReport).toContain("Private Security Advisory");
    expect(exploreSubmission).toContain("我授权项目在 Explore Guide 中展示");
    expect(exploreSubmission).toContain("不要提交后台地址");
    expect(issueConfig).toContain("security/advisories/new");
    expect(gitignore).toContain(".mdldm/");
    expect(releaseAudit).toContain(".mdldm");
  });

  it("keeps the minimum capability contract aligned across env and docs", async () => {
    const [envExample, capabilityMatrix] = await Promise.all([
      readProjectFile(".env.example"),
      readProjectFile("docs/CAPABILITY_MATRIX.md"),
    ]);

    expect(envExample).toContain("# 1. 最低核心");
    expect(envExample).toContain("PAYMENT_PROVIDER=manual");
    expect(envExample).toContain("TRANSCODE_PROVIDER=none");
    expect(envExample).not.toMatch(/^STORAGE_PROVIDER=s3$/m);
    expect(envExample).not.toMatch(/^OBSERVABILITY_PROVIDER=sentry$/m);
    for (const key of [
      "APP_URL",
      "MONGODB_URI",
      "AUTH_SECRET",
      "INITIAL_SETUP_TOKEN",
    ]) {
      expect(capabilityMatrix).toContain(key);
    }
    expect(capabilityMatrix).toContain("未启用时的真实行为");
    expect(capabilityMatrix).toContain("Development、Preview、Production");
  });
});
