import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { setSetupLessonCompleted } from "@/app/lib/site-initialization-service";
import { setupProgressInputSchema } from "@/modules/site/initialization";

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = setupProgressInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "开站任务状态格式错误" },
      { status: 400 },
    );
  }

  const state = await setSetupLessonCompleted({
    adminId: authorization.user.id,
    lesson: parsed.data.lesson,
    completed: parsed.data.completed,
  });

  return NextResponse.json({
    status: state.status,
    completedLessons: state.completedLessons,
  });
}
