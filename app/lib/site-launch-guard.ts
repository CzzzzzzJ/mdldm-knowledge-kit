import { redirect } from "next/navigation";

import { getSiteInitializationState } from "@/app/lib/site-initialization-service";
import { getCurrentUser } from "@/providers/auth/session";

export async function requirePublicSiteAccess(): Promise<void> {
  const initialization = await getSiteInitializationState();
  if (initialization.status === "live") {
    return;
  }

  const user = await getCurrentUser();
  if (user?.role === "admin") {
    if (user.requiresPasswordChange) {
      redirect("/admin/activate");
    }
    return;
  }

  redirect("/admin");
}
