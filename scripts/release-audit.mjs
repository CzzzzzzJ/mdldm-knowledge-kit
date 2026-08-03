import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "LICENSE",
  "README.md",
  "START_HERE.md",
  "AGENT_QUICKSTART.md",
  "AGENT_SERVERLESS_DEPLOY.md",
  "AGENT_TASKS.md",
  ".github/ISSUE_TEMPLATE/01-bug.yml",
  ".github/ISSUE_TEMPLATE/02-feature.yml",
  ".github/ISSUE_TEMPLATE/03-agent-report.yml",
  ".github/ISSUE_TEMPLATE/04-explore-submission.yml",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "THIRD_PARTY_NOTICES.md",
  ".env.example",
  "docs/DEPLOYMENT.md",
  "docs/BACKUP_AND_RECOVERY.md",
  "docs/FRESH_INSTALL_CHECK.md",
  "docs/UPGRADING.md",
  "docs/RELEASE.md",
];
const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp4",
  ".pdf",
  ".png",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
]);
const allowedEmailDomains = new Set([
  "example.com",
  "example.invalid",
  "users.noreply.github.com",
]);
const allowedLicenses = new Set([
  "0BSD",
  "Apache2",
  "Apache-2.0",
  "Apache-2.0 AND LGPL-3.0-or-later",
  "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "LGPL-3.0-or-later",
  "MIT",
  "MIT,Apache2",
  "MIT-0",
  "MPL-2.0",
  "Python-2.0",
  "SIL OPEN FONT LICENSE",
]);
const secretPatterns = [
  {
    name: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "GitHub token",
    pattern: /\b(?:github_pat_|gh[opusr]_|ghp_)[A-Za-z0-9_]{20,}\b/,
  },
  {
    name: "AWS access key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: "Alibaba Cloud access key",
    pattern: /\bLTAI[A-Za-z0-9]{16,}\b/,
  },
  {
    name: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  },
];

function listCandidateFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root },
  )
    .toString()
    .split("\0")
    .filter(Boolean)
    .filter((file) => existsSync(path.join(root, file)));
}

function addFinding(findings, file, message) {
  findings.push(`${file}: ${message}`);
}

async function auditTextFiles(files, findings) {
  for (const file of files) {
    if (binaryExtensions.has(path.extname(file).toLowerCase())) {
      continue;
    }
    const absolutePath = path.join(root, file);
    let content;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch {
      continue;
    }

    if (/\/Users\/[^/\s]+|[A-Z]:\\Users\\/i.test(content)) {
      addFinding(findings, file, "包含本机用户绝对路径");
    }
    for (const { name, pattern } of secretPatterns) {
      if (pattern.test(content)) {
        addFinding(findings, file, `疑似包含 ${name}`);
      }
    }

    const emailScanContent = content.replace(
      /mongodb(?:\+srv)?:\/\/[^\s@]+@/gi,
      "mongodb://",
    );
    for (const match of emailScanContent.matchAll(
      /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
    )) {
      const domain = match[1].toLowerCase();
      if (!allowedEmailDomains.has(domain)) {
        addFinding(findings, file, `包含非示例邮箱域名 ${domain}`);
      }
    }

    for (const match of content.matchAll(
      /mongodb(?:\+srv)?:\/\/([^:\s/]+):([^@\s/]+)@([^/\s]+)/gi,
    )) {
      const host = match[3].toLowerCase();
      const fixture =
        host.endsWith(".example") ||
        host.endsWith(".example.com") ||
        host.endsWith(".example.invalid") ||
        match[1].includes("replace") ||
        match[2].includes("replace");
      if (!fixture) {
        addFinding(findings, file, "疑似包含带凭据的 MongoDB URI");
      }
    }
  }
}

async function main() {
  const findings = [];
  const files = listCandidateFiles();
  const fileSet = new Set(files);

  for (const file of requiredFiles) {
    if (!fileSet.has(file)) {
      addFinding(findings, file, "发布必需文件缺失");
    }
  }

  for (const file of files) {
    if (
      (/^\.env(?:\.|$)/.test(file) && file !== ".env.example") ||
      /(^|\/)(?:data|uploads|playwright-report|test-results|\.local-planning|\.mdldm)\//.test(file) ||
      /^docs\/analysis\//.test(file) ||
      /(^|\/)(?:credentials|service-account)[^/]*\.json$/i.test(file)
    ) {
      addFinding(findings, file, "不应进入发布仓库");
    }
  }

  await auditTextFiles(files, findings);

  const packageJson = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  if (packageJson.version !== "0.1.0") {
    addFinding(findings, "package.json", "version 必须与 v0.1.0 发布一致");
  }
  if (packageJson.license !== "Apache-2.0") {
    addFinding(findings, "package.json", "license 必须为 Apache-2.0");
  }

  if (packageJson.packageManager !== "pnpm@10.14.0") {
    addFinding(findings, "package.json", "packageManager 必须固定为 pnpm@10.14.0");
  }
  if (!existsSync(path.join(root, "pnpm-lock.yaml"))) {
    addFinding(findings, "pnpm-lock.yaml", "pnpm 锁文件缺失");
  }
  for (const forbiddenLockfile of [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
  ]) {
    if (existsSync(path.join(root, forbiddenLockfile))) {
      addFinding(findings, forbiddenLockfile, "仓库只允许 pnpm-lock.yaml");
    }
  }

  const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  let licenseGroups = {};
  try {
    licenseGroups = JSON.parse(
      execFileSync(packageManagerCommand, ["licenses", "list", "--json"], {
        cwd: root,
        encoding: "utf8",
      }),
    );
  } catch (error) {
    addFinding(
      findings,
      "pnpm-lock.yaml",
      `无法读取依赖许可证，请先运行 pnpm install --frozen-lockfile：${error.message}`,
    );
  }
  for (const [license, packages] of Object.entries(licenseGroups)) {
    if (!allowedLicenses.has(license)) {
      const packageNames = packages
        .slice(0, 5)
        .map((item) => `${item.name}@${item.versions.join(",")}`)
        .join("、");
      addFinding(
        findings,
        "pnpm-lock.yaml",
        `${packageNames} 使用未审核许可证 ${license}`,
      );
    }
  }

  const dependencyRecords = Object.values(licenseGroups).reduce(
    (count, packages) =>
      count +
      packages.reduce(
        (subtotal, item) => subtotal + item.versions.length,
        0,
      ),
    0,
  );

  const tag = process.env.GITHUB_REF_TYPE === "tag"
    ? process.env.GITHUB_REF_NAME
    : undefined;
  if (tag && tag !== `v${packageJson.version}`) {
    addFinding(
      findings,
      "package.json",
      `Git tag ${tag} 与 package version ${packageJson.version} 不一致`,
    );
  }

  if (findings.length > 0) {
    console.error("Release audit failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Release audit passed: ${files.length} files, ${dependencyRecords} dependency records, no forbidden paths, credentials, private data emails or unreviewed licenses.`,
  );
}

await main();
