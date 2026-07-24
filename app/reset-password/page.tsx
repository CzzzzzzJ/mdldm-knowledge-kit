import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/identity-forms";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";

export default function ResetPasswordPage() {
  const site = getSiteConfig();
  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-semibold tracking-[-0.045em]">
            设置新密码
          </h1>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
