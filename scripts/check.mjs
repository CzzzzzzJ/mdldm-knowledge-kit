import { spawnSync } from "node:child_process";

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const buildEnv = {
  ...process.env,
  APP_URL: "https://ci.example.invalid",
  AUTH_SECRET: "ci-only-secret-value-with-more-than-32-characters",
  MONGODB_URI: "mongodb://127.0.0.1:27017/mdldm_knowledge_kit_test",
  PAYMENT_PROVIDER: "manual",
};

for (const script of ["lint", "typecheck", "test", "build"]) {
  const result = spawnSync(packageManagerCommand, [script], {
    env: script === "build" ? buildEnv : process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
