import { NextResponse, type NextRequest } from "next/server";

import {
  getConfigWarnings,
  getPublicRuntimeConfig,
  getServerEnv,
} from "@/config/env";
import type { HealthCheck } from "@/modules/operations";
import { mongoDatabaseProvider } from "@/providers/database/mongodb/connection";
import { getProviderReadiness } from "@/providers/readiness";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get("deep") === "1";
  const env = getServerEnv();
  const runtime = getPublicRuntimeConfig();

  const database: HealthCheck = deep
    ? await mongoDatabaseProvider.health()
    : {
        status: "not_checked",
        checkedAt: new Date().toISOString(),
        message: "使用 ?deep=1 执行 MongoDB 连通性检查",
      };

  const status = database.status === "error" ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      checkedAt: new Date().toISOString(),
      version: "0.1.0-alpha.5",
      uptimeSeconds: Math.floor(process.uptime()),
      app: {
        name: runtime.appName,
        environment: runtime.environment,
      },
      database,
      providers: getProviderReadiness(runtime),
      warnings: getConfigWarnings(env),
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
