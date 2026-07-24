import { NextResponse, type NextRequest } from "next/server";

import { rejectCrossOriginMutation } from "@/app/lib/request-security";
import { destroySession } from "@/providers/auth/session";

export async function POST(request: NextRequest) {
  const rejection = rejectCrossOriginMutation(request);
  if (rejection) {
    return rejection;
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
