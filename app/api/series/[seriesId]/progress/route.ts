import { NextResponse } from "next/server";

import { getSeriesProgress } from "@/app/lib/learning-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ seriesId: string }> },
) {
  const { seriesId } = await context.params;
  const progress = await getSeriesProgress(seriesId);
  if (!progress) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  return NextResponse.json({ progress });
}
