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
    const agentQuickstart = await readProjectFile("AGENT_QUICKSTART.md");
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
