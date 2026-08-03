import { spawnSync } from "node:child_process";

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

for (const script of ["test:l1", "test:l2", "test:l3"]) {
  const result = spawnSync(packageManagerCommand, [script], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
