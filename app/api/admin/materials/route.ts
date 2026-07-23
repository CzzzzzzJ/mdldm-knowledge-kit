import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import { accessLevels } from "@/modules/catalog";
import { connectMongo } from "@/providers/database/mongodb/connection";
import { CourseMaterialModel } from "@/providers/database/mongodb/models/learning";
import { MediaAssetModel } from "@/providers/database/mongodb/models/media";
import { CourseModel } from "@/providers/database/mongodb/models/series";

const materialInput = z.object({
  courseId: z.string().refine(isValidObjectId),
  mediaAssetId: z.string().refine(isValidObjectId),
  title: z.string().trim().min(1).max(120),
  position: z.number().int().min(0).max(10_000),
  accessLevel: z.enum(accessLevels),
});

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const parsed = materialInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "课程资料格式错误" }, { status: 400 });
  }

  await connectMongo();
  const [course, asset] = await Promise.all([
    CourseModel.exists({ _id: parsed.data.courseId }),
    MediaAssetModel.exists({
      _id: parsed.data.mediaAssetId,
      kind: "document",
      status: "ready",
    }),
  ]);

  if (!course || !asset) {
    return NextResponse.json({ error: "课程或资料资产不存在" }, { status: 404 });
  }

  const material = await CourseMaterialModel.create(parsed.data);
  return NextResponse.json(
    {
      material: {
        id: material._id.toString(),
        title: material.title,
      },
    },
    { status: 201 },
  );
}
