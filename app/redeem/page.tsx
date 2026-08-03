import { redirect } from "next/navigation";

import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import { RedeemInvitationForm } from "@/components/identity-forms";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export default async function RedeemPage() {
  await requirePublicSiteAccess();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/redeem");
  }
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-semibold tracking-[-0.045em]">
            兑换权益
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            邀请码可以授予全站会员、指定系列或指定单课权益。
          </p>
          <RedeemInvitationForm />
        </div>
      </main>
    </>
  );
}
