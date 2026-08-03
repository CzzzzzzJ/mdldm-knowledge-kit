import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prepareLocalEnvContent } from "@/modules/site/local-quickstart";

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}

async function main() {
  const root = process.cwd();
  const packageJsonPath = path.join(root, "package.json");
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8"),
  ) as { name?: string };

  if (packageJson.name !== "mdldm-knowledge-kit") {
    throw new Error(
      "当前目录不是 mdldm-knowledge-kit 根目录，请先进入项目目录再运行。",
    );
  }

  const examplePath = path.join(root, ".env.example");
  const localPath = path.join(root, ".env.local");
  const exampleContent = await readFile(examplePath, "utf8");
  const existingContent = await readOptional(localPath);
  const result = prepareLocalEnvContent({
    exampleContent,
    existingContent,
    generatedAuthSecret: randomBytes(32).toString("hex"),
  });

  if (result.changed) {
    await writeFile(localPath, result.content, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
  await chmod(localPath, 0o600);

  if (result.created) {
    console.log("已创建仅供本机使用的 .env.local。");
  } else if (result.changed) {
    console.log("已保留现有配置，并修复 .env.local 的身份密钥。");
  } else {
    console.log(".env.local 已存在且身份密钥有效，未覆盖现有配置。");
  }
  if (result.generatedAuthSecret) {
    console.log("AUTH_SECRET 已安全生成并写入文件，本命令不会打印密钥值。");
  }
  console.log("下一步：启动 MongoDB，然后运行 pnpm check-config。");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  console.error(`本地环境准备失败：${message}`);
  process.exitCode = 1;
});
