import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  CatalogAdminError,
  publishCourse,
} from "@/app/lib/catalog-admin-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { courseId } = await context.params;
  try {
    return NextResponse.json({ course: await publishCourse(courseId) });
  } catch (error) {
    if (error instanceof CatalogAdminError) {
      const status = error.code === "COURSE_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
