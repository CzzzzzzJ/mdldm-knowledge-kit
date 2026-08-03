import { spawnSync } from "node:child_process";

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

let exitCode = 0;

for (const script of ["test:l4:auto", "test:l4:manual"]) {
  const result = spawnSync(packageManagerCommand, [script], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    exitCode = result.status ?? 1;
    break;
  }
}

const typegen = spawnSync(packageManagerCommand, ["exec", "next", "typegen"], {
  env: process.env,
  stdio: "inherit",
});
if (typegen.error) throw typegen.error;
if (typegen.status !== 0 && exitCode === 0) exitCode = typegen.status ?? 1;

process.exit(exitCode);
