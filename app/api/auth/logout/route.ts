import { NextResponse, type NextRequest } from "next/server";

import {
  getExpectedRequestOrigin,
  isSameOriginRequest,
} from "@/modules/identity/security";
import { destroySession } from "@/providers/auth/session";

export async function POST(request: NextRequest) {
  const expectedOrigin = getExpectedRequestOrigin(
    request.headers,
    request.nextUrl.protocol,
  );
  if (
    !expectedOrigin ||
    !isSameOriginRequest(request.headers.get("origin"), expectedOrigin)
  ) {
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
