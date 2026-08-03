import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import {
  getConfigWarnings,
  getPublicRuntimeConfig,
  getServerEnv,
  isAuthSecretConfigured,
  isInitialSetupTokenConfigured,
} from "@/config/env";
import {
  assessServerlessReadiness,
  type ServerlessProbeResult,
  validateServerlessProbeUrl,
} from "@/modules/site/serverless-readiness";

interface PackageManifest {
  packageManager?: string;
}

interface VercelConfig {
  installCommand?: string;
  buildCommand?: string;
  regions?: string[];
}

function readUrlArgument(argv: string[]): string | undefined {
  const inline = argv.find((argument) => argument.startsWith("--url="));
  if (inline) {
    return inline.slice("--url=".length);
  }

  const index = argv.indexOf("--url");
  return index >= 0 ? argv[index + 1] : undefined;
}

async function probeHealth(
  origin: URL,
  deep: boolean,
): Promise<"pass" | "fail"> {
  const endpoint = new URL("/api/health", origin);
  if (deep) {
    endpoint.searchParams.set("deep", "1");
  }

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return "fail";
    }

    const body = (await response.json()) as {
      status?: unknown;
      database?: { status?: unknown };
    };
    if (body.status !== "ok") {
      return "fail";
    }

    return deep && body.database?.status !== "ok" ? "fail" : "pass";
  } catch {
    return "fail";
  }
}

async function createProbeResult(
  input: string | undefined,
): Promise<ServerlessProbeResult> {
  if (!input) {
    return { requested: false, shallow: "not_run", deep: "not_run" };
  }

  const origin = validateServerlessProbeUrl(input);
  return {
    requested: true,
    shallow: await probeHealth(origin, false),
    deep: await probeHealth(origin, true),
  };
}

async function main() {
  const root = process.cwd();
  loadEnvConfig(root);

  const [packageJson, vercelConfig, dockerCompose] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, "vercel.json"), "utf8"),
    readFile(path.join(root, "docker-compose.yml"), "utf8"),
  ]);

  const manifest = JSON.parse(packageJson) as PackageManifest;
  const vercel = JSON.parse(vercelConfig) as VercelConfig;
  const dockerScope = dockerCompose.match(
    /^x-mdldm-scope:\s*([a-z0-9-]+)\s*$/m,
  )?.[1];
  const env = getServerEnv();
  const probe = await createProbeResult(readUrlArgument(process.argv.slice(2)));
  const report = assessServerlessReadiness({
    runtime: getPublicRuntimeConfig(),
    authSecretConfigured: isAuthSecretConfigured(env),
    initialSetupTokenConfigured: isInitialSetupTokenConfigured(env),
    configWarnings: getConfigWarnings(env),
    repository: {
      packageManager: manifest.packageManager ?? null,
      installCommand: vercel.installCommand ?? null,
      buildCommand: vercel.buildCommand ?? null,
      regions: vercel.regions ?? [],
      dockerScope: dockerScope ?? null,
    },
    probe,
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.status === "BLOCKED") {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: "BLOCKED",
        scope: "technical-readiness",
        message: error instanceof Error ? error.message : "未知检查错误",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
