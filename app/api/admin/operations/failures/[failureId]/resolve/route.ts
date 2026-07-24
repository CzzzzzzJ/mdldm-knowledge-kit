import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { resolveOperationalFailure } from "@/app/lib/operations-service";

const schema = z
  .object({
    note: z.string().trim().min(2).max(500),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ failureId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请填写 2～500 字处理说明" }, { status: 400 });
  }
  const { failureId } = await context.params;
  const resolved = await resolveOperationalFailure({
    failureId,
    adminId: authorization.user.id,
    note: parsed.data.note,
  });
  if (!resolved) {
    return NextResponse.json(
      { error: "故障不存在或已被处理" },
      { status: 404 },
    );
  }
  return NextResponse.json({ resolved: true });
}
