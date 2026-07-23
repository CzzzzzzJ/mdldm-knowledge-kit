import { loadEnvConfig } from "@next/env";
import { ZodError } from "zod";

import {
  getConfigWarnings,
  getPublicRuntimeConfig,
  getServerEnv,
} from "@/config/env";
import { getProviderReadiness } from "@/providers/readiness";

loadEnvConfig(process.cwd());

try {
  const env = getServerEnv();
  const runtime = getPublicRuntimeConfig();
  const warnings = getConfigWarnings(env);

  console.log("配置校验通过");
  console.log(JSON.stringify({ runtime, providers: getProviderReadiness(runtime) }, null, 2));

  if (warnings.length > 0) {
    console.log("配置提示");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
} catch (error) {
  console.error("配置校验失败");

  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    }
  } else {
    console.error(error);
  }

  process.exitCode = 1;
}
