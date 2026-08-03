import { NextResponse, type NextRequest } from "next/server";

import { authorizeAdminMutation } from "@/app/lib/admin-api";
import {
  launchSite,
  SiteInitializationError,
} from "@/app/lib/site-initialization-service";

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminMutation(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const state = await launchSite(authorization.user.id);
    return NextResponse.json({
      status: state.status,
      launchedAt: state.launchedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (
      error instanceof SiteInitializationError &&
      error.code === "SITE_NOT_READY"
    ) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }
    throw error;
  }
}
