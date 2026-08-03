import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CatalogAdminError,
  createCourseMaterial,
} from "@/app/lib/catalog-admin-service";
import { accessLevels } from "@/modules/catalog";

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

  try {
    const material = await createCourseMaterial(parsed.data);
    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    if (error instanceof CatalogAdminError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
