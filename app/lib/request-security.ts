import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/config/env";
import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";
import { consumeRateLimit } from "@/providers/rate-limit/mongodb";

export function rejectCrossOriginMutation(
  request: NextRequest,
): NextResponse | null {
  const env = getServerEnv();
  const expectedOrigin =
    env.NODE_ENV === "production"
      ? env.APP_URL
      : getExpectedRequestOrigin(
          request.headers,
          request.nextUrl.protocol,
        );

  if (
    expectedOrigin &&
    isSameOriginRequest(request.headers.get("origin"), expectedOrigin)
  ) {
    return null;
  }

  return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
}

export function getClientAddress(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

export async function applyRequestRateLimit(
  request: NextRequest,
  action: string,
  options: { limit: number; windowMs: number },
): Promise<NextResponse | null> {
  const result = await consumeRateLimit(
    `${action}:${getClientAddress(request)}`,
    options,
  );

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "操作过于频繁，请稍后再试" },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
