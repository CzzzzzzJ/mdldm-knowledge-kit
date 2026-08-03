import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import {
  getAgentContextReport,
  getUnavailableAgentContextReport,
} from "@/app/lib/agent-context-service";

async function main() {
  loadEnvConfig(process.cwd());

  try {
    console.log(JSON.stringify(await getAgentContextReport(), null, 2));
  } catch {
    console.log(
      JSON.stringify(getUnavailableAgentContextReport(), null, 2),
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

void main();
