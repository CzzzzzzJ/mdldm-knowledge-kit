import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { accessLevels } from "@/modules/catalog";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  CourseModel,
  SeriesModel,
} from "@/providers/database/mongodb/models/series";

const courseInput = z.object({
  seriesId: z.string().refine(isValidObjectId),
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().min(1).max(1_000),
  accessLevel: z.enum(accessLevels),
  position: z.number().int().min(0).max(10_000),
});

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = courseInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "课时数据格式错误" }, { status: 400 });
  }

  await connectMongo();
  if (!(await SeriesModel.exists({ _id: parsed.data.seriesId }))) {
    return NextResponse.json({ error: "系列不存在" }, { status: 404 });
  }

  if (
    await CourseModel.exists({
      seriesId: parsed.data.seriesId,
      slug: parsed.data.slug,
    })
  ) {
    return NextResponse.json({ error: "当前系列内 slug 已存在" }, { status: 409 });
  }

  const course = await CourseModel.create({
    ...parsed.data,
    videoAssetId: null,
    status: "draft",
    publishedAt: null,
  });

  return NextResponse.json(
    {
      course: {
        id: course._id.toString(),
        title: course.title,
        status: course.status,
      },
    },
    { status: 201 },
  );
}
