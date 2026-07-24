import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/identity-forms";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";

export default function VerifyEmailPage() {
  const site = getSiteConfig();
  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-semibold tracking-[-0.045em]">
            验证邮箱
          </h1>
          <Suspense fallback={null}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
