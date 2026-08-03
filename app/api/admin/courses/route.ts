import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CatalogAdminError,
  createCourse,
} from "@/app/lib/catalog-admin-service";
import { accessLevels } from "@/modules/catalog";

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

  try {
    const course = await createCourse(parsed.data);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    if (error instanceof CatalogAdminError) {
      const status = error.code === "SERIES_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
