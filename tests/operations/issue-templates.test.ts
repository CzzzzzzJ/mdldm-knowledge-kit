import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function readTemplate(name: string) {
  return readFile(
    path.join(process.cwd(), ".github", "ISSUE_TEMPLATE", name),
    "utf8",
  );
}

describe("public issue contracts", () => {
  it("keeps Agent reports human-reviewed and routes vulnerabilities privately", async () => {
    const [agentReport, config] = await Promise.all([
      readTemplate("03-agent-report.yml"),
      readTemplate("config.yml"),
    ]);

    expect(agentReport).toContain("pnpm run doctor --issue");
    expect(agentReport).toContain("人工检查");
    expect(agentReport).toContain("Private Security Advisory");
    expect(agentReport).toContain("我理解 Doctor 没有自动提交");
    expect(config).toContain("security/advisories/new");
    expect(config).toContain("blank_issues_enabled: false");
  });

  it("requires explicit public authorization for Explore submissions", async () => {
    const explore = await readTemplate("04-explore-submission.yml");

    expect(explore).toContain("只填写任何访客都可以安全访问的 HTTPS 首页");
    expect(explore).toContain("我是该站点的所有者");
    expect(explore).toContain("我授权项目在 Explore Guide 中展示");
    expect(explore).toContain("不包含未授权内容、用户数据、测试账号或敏感配置");
    expect(explore).not.toContain("admin@example.com");
  });
});
