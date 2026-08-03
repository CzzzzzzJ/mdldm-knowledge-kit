import { redirect } from "next/navigation";

import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import { ChangePasswordForm } from "@/components/identity-forms";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  await requirePublicSiteAccess();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account/security");
  }
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <p className="font-mono text-xs text-[var(--accent)]">{user.email}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
            账号安全
          </h1>
          <ChangePasswordForm />
        </div>
      </main>
    </>
  );
}
